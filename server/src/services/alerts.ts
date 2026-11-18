import { Notification, SavedRoute, TrainInstance, User } from '../models';
import { CrowdLevel, DelayCategory } from '../types';
import { CROWD_LABELS, DELAY_LABELS } from './labels';
import { runtime } from './runtime';
import { Kind } from './status';

/**
 * Called only when a report CHANGES the confirmed status of a train at a station
 * (never for every report). Notifies users whose saved route is served by that train.
 */
export async function sendRouteAlerts(kind: Kind, instanceId: string, stationName: string, value: string) {
  const instance = await TrainInstance.findById(instanceId)
    .populate({ path: 'train', populate: { path: 'stations', select: 'name' } })
    .lean();
  const train = instance?.train as any;
  if (!train) return 0;
  const names: string[] = train.stations.map((s: any) => s.name);

  const routes = await SavedRoute.find({ line: train.line }).populate('source destination', 'name').lean();
  const userIds = new Set<string>();
  for (const r of routes as any[]) {
    const from = names.indexOf(r.source?.name);
    const to = names.indexOf(r.destination?.name);
    const prefOk = r.preference === 'any' || r.preference === train.type;
    if (from !== -1 && to !== -1 && from < to && prefOk) userIds.add(String(r.user));
  }
  if (!userIds.size) return 0;

  const users = await User.find({
    _id: { $in: [...userIds] },
    'notificationSettings.enabled': true,
    [`notificationSettings.${kind}`]: true,
  })
    .select('_id')
    .lean();

  const label = kind === 'crowd' ? CROWD_LABELS[value as CrowdLevel] : DELAY_LABELS[value as DelayCategory];
  const title = kind === 'crowd' ? `Crowd update: ${train.name}` : `Delay update: ${train.name}`;
  const body = `${label} confirmed by commuters at ${stationName}.`;

  for (const u of users) {
    const n = await Notification.create({ user: u._id, type: kind, title, body, train: train._id, trainInstance: instanceId });
    runtime.io?.to(`user:${u._id}`).emit('route-alert', {
      _id: String(n._id),
      type: kind,
      title,
      body,
      trainInstanceId: instanceId,
      value,
      createdAt: n.createdAt,
    });
  }
  return users.length;
}
