import { Train, TrainInstance } from '../models';
import { addMinutes, cumulativeKm, toMinutes } from '../utils/geo';
import { summariesFor } from './status';

export interface TrainQuery {
  q?: string;
  line?: string;
  type?: string;
  direction?: string;
  from?: string; // station name
  to?: string; // station name
}

/** Scheduled time at each halt = departure + duration x (distance so far / total distance). */
export function stationTimes(train: any): { _id: string; name: string; code: string; lat: number; lng: number; time: string }[] {
  const cum = cumulativeKm(train.stations);
  const total = cum[cum.length - 1] || 1;
  return train.stations.map((s: any, i: number) => ({
    _id: String(s._id),
    name: s.name,
    code: s.code,
    lat: s.lat,
    lng: s.lng,
    time: addMinutes(train.departureTime, (train.durationMin * cum[i]) / total),
  }));
}

/** Search the simulated timetable and attach crowd/delay summaries for each train's live instance. */
export async function searchTrains(query: TrainQuery) {
  const filter: Record<string, unknown> = {};
  if (query.line) filter.line = query.line;
  if (query.type) filter.type = query.type;
  if (query.direction) filter.direction = query.direction;
  const trains = await Train.find(filter).populate('stations').sort({ departureTime: 1 }).lean();

  const q = query.q?.trim().toLowerCase();
  const from = query.from?.trim().toLowerCase();
  const to = query.to?.trim().toLowerCase();

  const matches = trains
    .map((train: any) => {
      const times = stationTimes(train);
      const names = times.map((s) => s.name.toLowerCase());
      const fromIdx = from ? names.indexOf(from) : -1;
      const toIdx = to ? names.indexOf(to) : -1;
      if (q && !train.name.toLowerCase().includes(q) && !train.number.includes(q)) return null;
      if (from && fromIdx === -1) return null;
      if (to && toIdx === -1) return null;
      if (from && to && fromIdx >= toIdx) return null; // must travel from -> to in this direction
      return { train, times, boardAt: fromIdx >= 0 ? times[fromIdx] : null, alightAt: toIdx >= 0 ? times[toIdx] : null };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  const instances = await TrainInstance.find({ train: { $in: matches.map((m) => m.train._id) } }).select('train').lean();
  const instanceByTrain = new Map(instances.map((i) => [String(i.train), String(i._id)]));
  const summary = await summariesFor([...instanceByTrain.values()]);

  return matches.map(({ train, times, boardAt, alightAt }) => {
    const instanceId = instanceByTrain.get(String(train._id)) ?? null;
    return {
      _id: String(train._id),
      number: train.number,
      name: train.name,
      line: train.line,
      type: train.type,
      direction: train.direction,
      source: times[0].name,
      destination: times[times.length - 1].name,
      departureTime: train.departureTime,
      arrivalTime: times[times.length - 1].time,
      durationMin: train.durationMin,
      haltCount: times.length,
      boardAt,
      alightAt,
      instanceId,
      ...(instanceId ? summary(instanceId) : { crowd: null, delay: null }),
    };
  });
}

/** Sort trains by how close their boarding time is to a preferred "HH:mm" (upcoming first). */
export function sortByPreferredTime<T extends { boardAt: { time: string } | null; departureTime: string }>(list: T[], hhmm: string) {
  const pref = toMinutes(hhmm);
  const delta = (t: T) => (toMinutes(t.boardAt?.time ?? t.departureTime) - pref + 1440) % 1440;
  return [...list].sort((a, b) => delta(a) - delta(b));
}
