import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { CrowdReport, Station } from '../models';
import { HttpError } from '../utils/httpError';

/**
 * Insights are plain MongoDB aggregations over stored crowd reports
 * (mostly seeded SAMPLE historical data). Score: green = 1, yellow = 2, red = 3.
 *
 * Every endpoint accepts an optional filter (all times in India Standard Time):
 *   ?day=1..7          one weekday across all weeks (1 = Monday, ISO numbering)
 *   ?date=YYYY-MM-DD   one calendar day
 * Without a filter, all stored reports are used.
 */
const TZ = 'Asia/Kolkata';
const IST_OFFSET_MS = 5.5 * 3600_000;
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const score = { $switch: { branches: [{ case: { $eq: ['$level', 'red'] }, then: 3 }, { case: { $eq: ['$level', 'yellow'] }, then: 2 }], default: 1 } };
const levelCounts = {
  count: { $sum: 1 },
  avgScore: { $avg: score },
  green: { $sum: { $cond: [{ $eq: ['$level', 'green'] }, 1, 0] } },
  yellow: { $sum: { $cond: [{ $eq: ['$level', 'yellow'] }, 1, 0] } },
  red: { $sum: { $cond: [{ $eq: ['$level', 'red'] }, 1, 0] } },
};
const round = (n: number) => Math.round(n * 100) / 100;

type Match = Record<string, unknown>;
interface Filter {
  type: 'all' | 'weekday' | 'date';
  label: string;
  day?: number;
  date?: string;
  match: Match;
  minCount: number; // minimum reports for a station / hour to be ranked (smaller sets need lower thresholds)
}

/** Build the MongoDB $match for ?day= or ?date= (validated by the route). */
export function parseFilter(query: Request['query']): Filter {
  if (typeof query.date === 'string' && query.date) {
    const [y, m, d] = query.date.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, d) - IST_OFFSET_MS); // midnight IST
    const end = new Date(start.getTime() + 24 * 3600_000);
    const label = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    return { type: 'date', label, date: query.date, match: { reportedAt: { $gte: start, $lt: end } }, minCount: 3 };
  }
  if (query.day !== undefined && query.day !== '') {
    const day = Number(query.day);
    return {
      type: 'weekday',
      label: `Every ${DAY_NAMES[day - 1]}`,
      day,
      match: { $expr: { $eq: [{ $isoDayOfWeek: { date: '$reportedAt', timezone: TZ } }, day] } },
      minCount: 5,
    };
  }
  return { type: 'all', label: 'All days', match: {}, minCount: 10 };
}

const publicFilter = (f: Filter) => ({ type: f.type, label: f.label, day: f.day, date: f.date });

async function hourly(match: Match = {}) {
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

export async function overview(req: Request, res: Response) {
  const filter = parseFilter(req.query);
  const match = filter.match;
  const hours = await hourly(match);
  const [stations, trains, totals] = await Promise.all([
    CrowdReport.aggregate([
      { $match: match },
      { $group: { _id: '$station', ...levelCounts } },
      { $match: { count: { $gte: filter.minCount } } },
      { $sort: { avgScore: -1 } },
      { $limit: 6 },
      { $lookup: { from: 'stations', localField: '_id', foreignField: '_id', as: 's' } },
      { $unwind: '$s' },
      { $project: { _id: 1, name: '$s.name', line: '$s.line', count: 1, avgScore: { $round: ['$avgScore', 2] }, red: 1 } },
    ]),
    CrowdReport.aggregate([
      { $match: match },
      { $group: { _id: '$train', ...levelCounts } },
      { $sort: { avgScore: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'trains', localField: '_id', foreignField: '_id', as: 't' } },
      { $unwind: '$t' },
      { $project: { _id: 1, name: '$t.name', number: '$t.number', line: '$t.line', count: 1, avgScore: { $round: ['$avgScore', 2] } } },
    ]),
    CrowdReport.aggregate([{ $match: match }, { $group: { _id: '$isSample', count: { $sum: 1 } } }]),
  ]);

  const travelHours = hours.filter((h) => h.hour >= 6 && h.hour <= 22 && h.count >= Math.min(5, filter.minCount));
  res.json({
    sampleData: true,
    filter: publicFilter(filter),
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
  const filter = parseFilter(req.query);
  const hours = await hourly({ ...filter.match, station: new Types.ObjectId(String(req.params.stationId)) });
  res.json({ sampleData: true, filter: publicFilter(filter), station, hourly: hours, morning: summarise(hours, 7, 11), evening: summarise(hours, 17, 21) });
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
      return { day, isoDay: i + 1, count: r?.count ?? 0, avgScore: r ? round(r.avgScore) : 0, red: r?.red ?? 0 };
    }),
  });
}

/** Calendar support: every IST date that has crowd reports, with its count and average score. */
export async function datesWithData(_req: Request, res: Response) {
  const rows = await CrowdReport.aggregate([
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$reportedAt', timezone: TZ } }, count: { $sum: 1 }, avgScore: { $avg: score } } },
    { $sort: { _id: 1 } },
  ]);
  res.json({ dates: rows.map((r) => ({ date: r._id as string, count: r.count as number, avgScore: round(r.avgScore) })) });
}
