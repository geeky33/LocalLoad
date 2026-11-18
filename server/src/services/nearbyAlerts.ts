import { env } from '../config/env';
import { Notification, User } from '../models';
import type { PositionUpdate, RouteStop } from '../simulation/engine';
import { CrowdLevel } from '../types';
import { CROWD_LABELS } from './labels';
import { runtime } from './runtime';
import { statusesFor } from './status';

/**
 * NEAREST-STATION ALERTS
 * The phone tells the server only the NAME of its nearest station ("watch-station" socket event);
 * the user's coordinates never leave the phone. When a simulated train arrives at that station and
 * its crowd is CONFIRMED green or yellow (five-user rule), every watching user is notified.
 * Crowd source: the confirmed status at this station if there is one, otherwise the train's most
 * recent confirmed status elsewhere on its run. Red / unverified / mixed trains never alert.
 */
const lastAlert = new Map<string, number>(); // `${userId}|${station}` -> time of last alert (cooldown)

export async function handleArrival(update: PositionUpdate, station: RouteStop) {
  const io = runtime.io;
  if (!io) return 0;
  const sockets = await io.in(`station:${station.name}`).fetchSockets();
  const userIds = [...new Set(sockets.map((s) => s.data.userId as string | undefined).filter((id): id is string => !!id))];
  if (!userIds.length) return 0;

  const verdicts = (await statusesFor('crowd', [update.instanceId])).get(update.instanceId) ?? [];
  const confirmed = verdicts.find((v) => v.state === 'confirmed' && v.station._id === station.id) ?? verdicts.find((v) => v.state === 'confirmed');
  if (!confirmed || (confirmed.value !== 'green' && confirmed.value !== 'yellow')) return 0;

  const now = Date.now();
  const due = userIds.filter((id) => now - (lastAlert.get(`${id}|${station.name}`) ?? 0) >= env.nearbyAlertCooldownMs);
  if (!due.length) return 0;
  const users = await User.find({ _id: { $in: due }, 'notificationSettings.enabled': true, 'notificationSettings.nearby': { $ne: false } })
    .select('_id')
    .lean();

  const level = confirmed.value as CrowdLevel;
  const where = confirmed.station._id === station.id ? 'here' : `at ${confirmed.station.name}`;
  const title = `🚆 ${update.number} has reached ${station.name}`;
  const body = `${CROWD_LABELS[level]} – verified by ${confirmed.total} commuters ${where}. ${update.name}${update.nextStation ? `, next: ${update.nextStation.name}` : ''}. (Simulated train)`;

  for (const u of users) {
    const id = String(u._id);
    lastAlert.set(`${id}|${station.name}`, now);
    const n = await Notification.create({ user: u._id, type: 'nearby', title, body, train: update.trainId, trainInstance: update.instanceId });
    io.to(`user:${id}`).emit('route-alert', {
      _id: String(n._id),
      type: 'nearby',
      title,
      body,
      trainInstanceId: update.instanceId,
      value: level,
      createdAt: n.createdAt,
    });
  }
  return users.length;
}

/** For tests: forget cooldowns. */
export const resetNearbyCooldowns = () => lastAlert.clear();
