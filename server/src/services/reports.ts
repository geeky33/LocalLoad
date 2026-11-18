import { env } from '../config/env';
import { Station, TrainInstance, User } from '../models';
import { HttpError } from '../utils/httpError';
import { sendRouteAlerts } from './alerts';
import { runtime } from './runtime';
import { instanceStatus, Kind, KIND_CONFIG, recentVotes, verdictFor } from './status';
import { windowBucket } from './verification';

/**
 * Shared flow for crowd and delay reports (used by the API and by simulated commuters):
 *  1. check the train instance exists and the station is on its route
 *  2. reject if this user already has an active vote here (10-minute window) -> 409
 *  3. store the report (unique DB index is the final guard against duplicates)
 *  4. recompute the verdict, broadcast it to the train's room and to the live feed
 *  5. if the CONFIRMED value changed (and notify is on), send route alerts
 */
export async function submitReport(
  kind: Kind,
  userId: string,
  trainInstanceId: string,
  stationId: string,
  value: string,
  opts: { notify?: boolean } = {},
) {
  const { model, field } = KIND_CONFIG[kind];

  const instance: any = await TrainInstance.findById(trainInstanceId).populate('train', 'stations').lean();
  if (!instance) throw new HttpError(404, 'Train instance not found');
  if (!instance.train.stations.some((s: unknown) => String(s) === stationId)) {
    throw new HttpError(400, 'This station is not on the selected train route');
  }
  const station = await Station.findById(stationId).select('name').lean();

  const now = new Date();
  const before = await recentVotes(kind, trainInstanceId, stationId, now);
  const mine = before.find((v: { user: string }) => v.user === userId);
  if (mine) {
    const waitMin = Math.ceil((mine.reportedAt.getTime() + env.reportWindowMs - now.getTime()) / 60000);
    throw new HttpError(409, `You already reported for this train at this station. You can report again in ${waitMin} min.`);
  }

  try {
    await (model as any).create({
      user: userId,
      trainInstance: trainInstanceId,
      train: instance.train._id,
      station: stationId,
      [field]: value,
      reportedAt: now,
      windowBucket: windowBucket(now, env.reportWindowMs),
    });
  } catch (err: any) {
    if (err?.code === 11000) throw new HttpError(409, 'You already reported for this train at this station in this window.');
    throw err;
  }
  await User.updateOne({ _id: userId }, { $inc: { points: 1 } });

  const after = [...before, { user: userId, value, reportedAt: now }];
  const oldVerdict = verdictFor(kind, before, now);
  const newVerdict = verdictFor(kind, after, now);

  const status = await instanceStatus(kind, trainInstanceId);
  runtime.io?.to(`train:${trainInstanceId}`).emit(`${kind}-status-update`, status);
  // Lightweight ping for screens showing the live feed (Home). They re-fetch what they need.
  runtime.io?.to('feed').emit('feed-update', { kind, trainInstanceId, stationId });

  const confirmedChanged =
    newVerdict.state === 'confirmed' && (oldVerdict.state !== 'confirmed' || oldVerdict.value !== newVerdict.value);
  if (confirmedChanged && opts.notify !== false) {
    await sendRouteAlerts(kind, trainInstanceId, station?.name ?? 'a station', newVerdict.value!).catch((e) =>
      console.error('[alerts]', e),
    );
  }
  return { verdict: newVerdict, status };
}
