import { Request, Response } from 'express';
import { env } from '../config/env';
import { TrainInstance } from '../models';
import { submitReport } from '../services/reports';
import { instanceStatus, KIND_CONFIG, statusesFor } from '../services/status';

async function submit(kind: 'crowd' | 'delay', req: Request, res: Response) {
  const { field } = KIND_CONFIG[kind];
  const { verdict, status } = await submitReport(kind, req.user!.id, req.body.trainInstanceId, req.body.stationId, req.body[field]);
  res.status(201).json({ message: 'Report submitted. Thanks for helping fellow commuters!', verdict, status });
}

export const submitCrowd = (req: Request, res: Response) => submit('crowd', req, res);
export const submitDelay = (req: Request, res: Response) => submit('delay', req, res);

export async function crowdStatus(req: Request, res: Response) {
  res.json(await instanceStatus('crowd', String(req.params.trainInstanceId)));
}

export async function delayStatus(req: Request, res: Response) {
  res.json(await instanceStatus('delay', String(req.params.trainInstanceId)));
}

/** Recent crowd reports for a train instance (in the window), with reporter display names. */
export async function crowdReportsFor(req: Request, res: Response) {
  const since = new Date(Date.now() - env.reportWindowMs);
  const reports = await KIND_CONFIG.crowd.model
    .find({ trainInstance: req.params.trainInstanceId, reportedAt: { $gte: since } })
    .populate('station', 'name')
    .populate('user', 'name isDemo')
    .select('station user level reportedAt')
    .sort({ reportedAt: -1 })
    .lean();
  res.json(
    reports.map((r: any) => ({
      _id: r._id,
      station: r.station,
      level: r.level,
      reportedAt: r.reportedAt,
      reporter: r.user ? { name: r.user.isDemo ? r.user.name : shortName(r.user.name), demo: !!r.user.isDemo } : null,
    })),
  );
}

export const shortName = (full: string) => {
  const [first, ...rest] = full.trim().split(/\s+/);
  return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
};

/**
 * LIVE FEED: every train + station with crowd reports in the current window,
 * newest first, including who reported. Used by "Recent crowd updates" on Home.
 */
export async function recentCrowd(req: Request, res: Response) {
  const limit = Math.min(Number(req.query.limit) || 6, 20);
  const since = new Date(Date.now() - env.reportWindowMs);
  const ids = (await KIND_CONFIG.crowd.model.distinct('trainInstance', { reportedAt: { $gte: since } })).map(String);
  const statuses = await statusesFor('crowd', ids);
  const instances = await TrainInstance.find({ _id: { $in: ids } }).populate('train', 'number name line type direction').lean();
  const trainOf = new Map(instances.map((i: any) => [String(i._id), i.train]));

  const items = [...statuses.entries()]
    .flatMap(([instanceId, verdicts]) => verdicts.map((v) => ({ instanceId, train: trainOf.get(instanceId), ...v })))
    .filter((i) => i.train)
    .sort((a, b) => (b.lastUpdated?.getTime() ?? 0) - (a.lastUpdated?.getTime() ?? 0))
    .slice(0, limit);
  res.json({ windowMinutes: env.reportWindowMs / 60000, items });
}
