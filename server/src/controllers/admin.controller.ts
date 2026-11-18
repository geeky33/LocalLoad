import { Request, Response } from 'express';
import { CrowdReport, DelayReport, TrainInstance, User } from '../models';
import { engine, runtime } from '../services/runtime';
import { env } from '../config/env';
import { statusesFor } from '../services/status';
import { HttpError } from '../utils/httpError';

export async function users(_req: Request, res: Response) {
  res.json(await User.find().select('name email role points createdAt').sort({ createdAt: -1 }).lean());
}

export async function reports(_req: Request, res: Response) {
  const populate = [
    { path: 'user', select: 'name email' },
    { path: 'station', select: 'name' },
    { path: 'train', select: 'name number' },
  ];
  const [crowd, delay] = await Promise.all([
    CrowdReport.find({ isSample: false }).sort({ reportedAt: -1 }).limit(50).populate(populate).lean(),
    DelayReport.find({ isSample: false }).sort({ reportedAt: -1 }).limit(50).populate(populate).lean(),
  ]);
  res.json({ crowd, delay });
}

/** Live verification counts (in-window votes) for every train + station that has reports. */
export async function verification(_req: Request, res: Response) {
  const instances = await TrainInstance.find().populate('train', 'name number').lean();
  const ids = instances.map((i) => String(i._id));
  const [crowd, delay] = await Promise.all([statusesFor('crowd', ids), statusesFor('delay', ids)]);
  const rows = instances
    .map((i: any) => ({ instanceId: String(i._id), train: i.train, crowd: crowd.get(String(i._id)) ?? [], delay: delay.get(String(i._id)) ?? [] }))
    .filter((r) => r.crowd.length || r.delay.length);
  res.json(rows);
}

export function simulationStatus(_req: Request, res: Response) {
  const e = engine();
  res.json({
    running: e.running,
    intervalMs: e.intervalMs,
    multiplier: e.multiplier,
    ticks: e.tickCount,
    commuters: { running: runtime.commuters?.running ?? false, reportsSent: runtime.commuters?.reportsSent ?? 0 },
    trains: e.all(),
  });
}

export function startSimulation(_req: Request, res: Response) {
  engine().start();
  if (env.simCommuters) runtime.commuters?.start();
  res.json({ running: true });
}

export function stopSimulation(_req: Request, res: Response) {
  engine().stop();
  runtime.commuters?.stop();
  res.json({ running: false });
}

export async function resetSimulation(_req: Request, res: Response) {
  await engine().reset();
  res.json({ reset: true, running: engine().running });
}

export function setSpeed(req: Request, res: Response) {
  const m = Number(req.body.multiplier);
  if (!Number.isFinite(m) || m < 1 || m > 100) throw new HttpError(400, 'multiplier must be between 1 and 100');
  engine().setMultiplier(m);
  res.json({ multiplier: m });
}
