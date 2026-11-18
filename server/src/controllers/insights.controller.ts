import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { CrowdReport, Station } from '../models';
import { HttpError } from '../utils/httpError';

/**
 * Insights are plain MongoDB aggregations over stored crowd reports
 * (mostly seeded SAMPLE historical data). Score: green = 1, yellow = 2, red = 3.
 */
const TZ = 'Asia/Kolkata';
const score = { $switch: { branches: [{ case: { $eq: ['$level', 'red'] }, then: 3 }, { case: { $eq: ['$level', 'yellow'] }, then: 2 }], default: 1 } };
const levelCounts = {
  count: { $sum: 1 },
  avgScore: { $avg: score },
  green: { $sum: { $cond: [{ $eq: ['$level', 'green'] }, 1, 0] } },
  yellow: { $sum: { $cond: [{ $eq: ['$level', 'yellow'] }, 1, 0] } },
  red: { $sum: { $cond: [{ $eq: ['$level', 'red'] }, 1, 0] } },
};
const round = (n: number) => Math.round(n * 100) / 100;

async function hourly(match: Record<string, unknown> = {}) {
  const rows = await CrowdReport.aggregate([
    { $match: match },
    { $group: { _id: { $hour: { date: '$reportedAt', timezone: TZ } }, ...levelCounts } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((r) => ({ hour: r._id as number, count: r.count, avgScore: round(r.avgScore), green: r.green, yellow: r.yellow, red: r.red }));
}

function summarise(rows: Awaited<ReturnType<typeof hourly>>, from: number, to: number) {
  const sel = rows.filter((r) => r.hour >= from && r.hour < to);
  const count = sel.reduce((s, r) => s + r.count, 0);
  const sum = (k: 'green' | 'yellow' | 'red') => sel.reduce((s, r) => s + r[k], 0);
  const avg = count ? sel.reduce((s, r) => s + r.avgScore * r.count, 0) / count : 0;
  return { count, avgScore: round(avg), green: sum('green'), yellow: sum('yellow'), red: sum('red') };
}

export async function overview(_req: Request, res: Response) {
  const hours = await hourly();
  const [stations, trains, totals] = await Promise.all([
    CrowdReport.aggregate([
      { $group: { _id: '$station', ...levelCounts } },
      { $match: { count: { $gte: 10 } } },
      { $sort: { avgScore: -1 } },
      { $limit: 6 },
      { $lookup: { from: 'stations', localField: '_id', foreignField: '_id', as: 's' } },
      { $unwind: '$s' },
      { $project: { _id: 1, name: '$s.name', line: '$s.line', count: 1, avgScore: { $round: ['$avgScore', 2] }, red: 1 } },
    ]),
    CrowdReport.aggregate([
      { $group: { _id: '$train', ...levelCounts } },
      { $sort: { avgScore: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'trains', localField: '_id', foreignField: '_id', as: 't' } },
      { $unwind: '$t' },
      { $project: { _id: 1, name: '$t.name', number: '$t.number', line: '$t.line', count: 1, avgScore: { $round: ['$avgScore', 2] } } },
    ]),
    CrowdReport.aggregate([{ $group: { _id: '$isSample', count: { $sum: 1 } } }]),
  ]);

  const travelHours = hours.filter((h) => h.hour >= 6 && h.hour <= 22 && h.count >= 5);
  res.json({
    sampleData: true,
    note: 'Based on stored crowd reports, most of which are seeded sample (demo) data.',
    totalReports: totals.reduce((s, t) => s + t.count, 0),
    sampleReports: totals.find((t) => t._id === true)?.count ?? 0,
    hourly: hours,
    busiestSlots: [...travelHours].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3),
    bestTimes: [...travelHours].sort((a, b) => a.avgScore - b.avgScore).slice(0, 3),
    morningVsEvening: { morning: summarise(hours, 7, 11), evening: summarise(hours, 17, 21) },
    stations,
    trains,
  });
}

export async function stationInsights(req: Request, res: Response) {
  const station = await Station.findById(req.params.stationId).lean();
  if (!station) throw new HttpError(404, 'Station not found');
  const hours = await hourly({ station: new Types.ObjectId(String(req.params.stationId)) });
  res.json({ sampleData: true, station, hourly: hours, morning: summarise(hours, 7, 11), evening: summarise(hours, 17, 21) });
}

export async function weekly(_req: Request, res: Response) {
  const rows = await CrowdReport.aggregate([
    { $group: { _id: { $isoDayOfWeek: { date: '$reportedAt', timezone: TZ } }, ...levelCounts } },
    { $sort: { _id: 1 } },
  ]);
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  res.json({
    sampleData: true,
    days: DAYS.map((day, i) => {
      const r = rows.find((x) => x._id === i + 1);
      return { day, count: r?.count ?? 0, avgScore: r ? round(r.avgScore) : 0, red: r?.red ?? 0 };
    }),
  });
}
