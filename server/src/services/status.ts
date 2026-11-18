import { Types } from 'mongoose';
import { env } from '../config/env';
import { CrowdReport, DelayReport, Station, User } from '../models';
import { CROWD_LEVELS, DELAY_CATEGORIES } from '../types';
import { computeVerdict, Verdict } from './verification';

export type Kind = 'crowd' | 'delay';

export const KIND_CONFIG = {
  crowd: { model: CrowdReport, field: 'level', categories: CROWD_LEVELS },
  delay: { model: DelayReport, field: 'category', categories: DELAY_CATEGORIES },
} as const;

export interface Reporter {
  name: string; // real users: "First L.", demo commuters: full demo name
  demo: boolean;
  value: string;
  reportedAt: Date;
}

export interface StationVerdict extends Verdict<string> {
  station: { _id: string; name: string; code: string };
  reporters: Reporter[]; // who counted towards this verdict (one entry per user, newest first)
}

const displayName = (full: string, demo: boolean) => {
  if (demo) return full;
  const [first, ...rest] = full.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
};

export function verdictFor(kind: Kind, votes: { user: unknown; value: string; reportedAt: Date }[], now = new Date()) {
  return computeVerdict(
    votes.map((v) => ({ user: String(v.user), value: v.value, reportedAt: v.reportedAt })),
    {
      categories: KIND_CONFIG[kind].categories as readonly string[],
      threshold: env.verificationThreshold,
      windowMs: env.reportWindowMs,
      now,
    },
  );
}

/** Recent (in-window) votes for one train instance + station. */
export async function recentVotes(kind: Kind, instanceId: string, stationId: string, now = new Date()) {
  const { model, field } = KIND_CONFIG[kind];
  const docs = await (model as any)
    .find({ trainInstance: instanceId, station: stationId, reportedAt: { $gte: new Date(now.getTime() - env.reportWindowMs) } })
    .select(`user ${field} reportedAt`)
    .lean();
  return docs.map((d: any) => ({ user: String(d.user), value: d[field] as string, reportedAt: d.reportedAt as Date }));
}

/**
 * Per-station verdicts for many train instances at once.
 * Returns instanceId -> verdicts sorted with the most recently updated station first.
 */
export async function statusesFor(kind: Kind, instanceIds: string[], now = new Date()) {
  const { model, field } = KIND_CONFIG[kind];
  const result = new Map<string, StationVerdict[]>();
  if (!instanceIds.length) return result;
  const docs: any[] = await (model as any)
    .find({
      trainInstance: { $in: instanceIds.map((id) => new Types.ObjectId(id)) },
      reportedAt: { $gte: new Date(now.getTime() - env.reportWindowMs) },
    })
    .select(`user trainInstance station ${field} reportedAt`)
    .lean();

  const groups = new Map<string, any[]>();
  for (const d of docs) {
    const key = `${d.trainInstance}|${d.station}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push({ user: d.user, value: d[field], reportedAt: d.reportedAt });
  }
  const stationIds = [...new Set(docs.map((d) => String(d.station)))];
  const stations = await Station.find({ _id: { $in: stationIds } }).select('name code').lean();
  const stationMap = new Map(stations.map((s) => [String(s._id), s]));
  const users = await User.find({ _id: { $in: [...new Set(docs.map((d) => String(d.user)))] } }).select('name isDemo').lean();
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  for (const [key, votes] of groups) {
    const [instanceId, stationId] = key.split('|');
    const s = stationMap.get(stationId);
    // latest vote per user = the votes that actually count
    const latest = new Map<string, { user: unknown; value: string; reportedAt: Date }>();
    for (const vote of votes) {
      const prev = latest.get(String(vote.user));
      if (!prev || prev.reportedAt < vote.reportedAt) latest.set(String(vote.user), vote);
    }
    const reporters: Reporter[] = [...latest.values()]
      .sort((a, b) => b.reportedAt.getTime() - a.reportedAt.getTime())
      .map((vote) => {
        const u = userMap.get(String(vote.user));
        return { name: u ? displayName(u.name, !!u.isDemo) : 'Commuter', demo: !!u?.isDemo, value: vote.value, reportedAt: vote.reportedAt };
      });
    const v: StationVerdict = {
      ...verdictFor(kind, votes, now),
      station: { _id: stationId, name: s?.name ?? 'Unknown', code: s?.code ?? '' },
      reporters,
    };
    if (!result.has(instanceId)) result.set(instanceId, []);
    result.get(instanceId)!.push(v);
  }
  for (const list of result.values()) list.sort((a, b) => (b.lastUpdated?.getTime() ?? 0) - (a.lastUpdated?.getTime() ?? 0));
  return result;
}

/** Full status object for one instance, as sent over REST and Socket.IO. */
export async function instanceStatus(kind: Kind, instanceId: string) {
  const stations = (await statusesFor(kind, [instanceId])).get(instanceId) ?? [];
  return { trainInstanceId: instanceId, kind, summary: stations[0] ?? null, stations };
}

/** Compact summary (latest station verdict) for train cards. */
export async function summariesFor(instanceIds: string[]) {
  const [crowd, delay] = await Promise.all([statusesFor('crowd', instanceIds), statusesFor('delay', instanceIds)]);
  return (id: string) => ({ crowd: crowd.get(id)?.[0] ?? null, delay: delay.get(id)?.[0] ?? null });
}
