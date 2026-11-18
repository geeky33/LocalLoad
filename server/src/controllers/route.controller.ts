import { Request, Response } from 'express';
import { SavedRoute, Station } from '../models';
import { searchTrains, sortByPreferredTime } from '../services/trains';
import { HttpError } from '../utils/httpError';

async function checkStations(body: any) {
  const [src, dst] = await Promise.all([Station.findById(body.sourceId).lean(), Station.findById(body.destinationId).lean()]);
  if (!src || !dst) throw new HttpError(400, 'Source or destination station not found');
  if (src.name === dst.name) throw new HttpError(400, 'Source and destination must be different');
  if (src.line !== body.line || dst.line !== body.line) throw new HttpError(400, 'Both stations must be on the selected line');
  return { source: src._id, destination: dst._id };
}

export async function createRoute(req: Request, res: Response) {
  const stations = await checkStations(req.body);
  const route = await SavedRoute.create({
    user: req.user!.id,
    name: req.body.name,
    preferredTime: req.body.preferredTime,
    line: req.body.line,
    preference: req.body.preference ?? 'any',
    ...stations,
  });
  res.status(201).json(route);
}

/** Saved routes with the next few matching trains (and their crowd/delay status). */
export async function listRoutes(req: Request, res: Response) {
  const routes: any[] = await SavedRoute.find({ user: req.user!.id }).populate('source destination').sort({ createdAt: 1 }).lean();
  const withTrains = await Promise.all(
    routes.map(async (r) => {
      const trains = await searchTrains({
        line: r.line,
        type: r.preference === 'any' ? undefined : r.preference,
        from: r.source?.name,
        to: r.destination?.name,
      });
      return { ...r, trains: sortByPreferredTime(trains, r.preferredTime).slice(0, 3) };
    }),
  );
  res.json(withTrains);
}

export async function updateRoute(req: Request, res: Response) {
  const route = await SavedRoute.findOne({ _id: req.params.id, user: req.user!.id });
  if (!route) throw new HttpError(404, 'Route not found');
  const stations = await checkStations(req.body);
  route.set({
    name: req.body.name,
    preferredTime: req.body.preferredTime,
    line: req.body.line,
    preference: req.body.preference ?? 'any',
    ...stations,
  });
  await route.save();
  res.json(route);
}

export async function deleteRoute(req: Request, res: Response) {
  const result = await SavedRoute.deleteOne({ _id: req.params.id, user: req.user!.id });
  if (!result.deletedCount) throw new HttpError(404, 'Route not found');
  res.status(204).end();
}
