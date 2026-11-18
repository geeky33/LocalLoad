import { Request, Response } from 'express';
import { Station } from '../models';
import { distanceKm } from '../utils/geo';
import { HttpError } from '../utils/httpError';

export async function listStations(req: Request, res: Response) {
  const filter: Record<string, unknown> = {};
  if (req.query.line) filter.line = String(req.query.line);
  const stations = await Station.find(filter).sort({ line: 1, sequence: 1 }).lean();
  res.json(stations);
}

export async function getStation(req: Request, res: Response) {
  const station = await Station.findById(req.params.id).lean();
  if (!station) throw new HttpError(404, 'Station not found');
  res.json(station);
}

/**
 * NEAREST STATION
 * Given the user's coordinates, compute the straight-line (haversine) distance to every
 * station and return the closest ones. Stations on several lines (e.g. Dadar) are merged
 * into one result. The location is used only for this calculation and is never stored.
 */
const OUT_OF_AREA_KM = 40;

export async function nearestStations(req: Request, res: Response) {
  const here = { lat: Number(req.query.lat), lng: Number(req.query.lng) };
  const limit = Math.min(Number(req.query.limit) || 3, 10);
  const stations = await Station.find().lean();

  const byName = new Map<string, { name: string; lat: number; lng: number; distanceKm: number; stations: { _id: string; line: string; code: string }[] }>();
  for (const s of stations) {
    const d = distanceKm(here, s);
    const entry = byName.get(s.name);
    const ref = { _id: String(s._id), line: s.line, code: s.code };
    if (!entry) byName.set(s.name, { name: s.name, lat: s.lat, lng: s.lng, distanceKm: d, stations: [ref] });
    else {
      entry.stations.push(ref);
      if (d < entry.distanceKm) Object.assign(entry, { lat: s.lat, lng: s.lng, distanceKm: d });
    }
  }

  const nearest = [...byName.values()]
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit)
    .map((s) => ({
      ...s,
      distanceKm: Math.round(s.distanceKm * 100) / 100,
      walkMinutes: Math.round((s.distanceKm / 4.5) * 60), // ~4.5 km/h walking pace, straight line
      lines: [...new Set(s.stations.map((x) => x.line))],
    }));

  res.json({
    nearest,
    outOfArea: (nearest[0]?.distanceKm ?? Infinity) > OUT_OF_AREA_KM,
    note: 'Straight-line distance from your location to the station coordinates used by LocalLoad.',
  });
}
