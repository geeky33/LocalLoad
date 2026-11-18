import { Request, Response } from 'express';
import { engine } from '../services/runtime';
import { HttpError } from '../utils/httpError';

const NOTE = 'Train positions are simulated for demonstration purposes.';

export function activeTrains(_req: Request, res: Response) {
  const e = engine();
  res.json({ simulated: true, note: NOTE, running: e.running, trains: e.all() });
}

export function trackInstance(req: Request, res: Response) {
  const id = String(req.params.trainInstanceId);
  const position = engine().get(id);
  if (!position) throw new HttpError(404, 'Train instance not found');
  res.json({ simulated: true, note: NOTE, position, route: engine().routeOf(id) });
}
