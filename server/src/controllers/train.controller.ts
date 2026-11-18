import { Request, Response } from 'express';
import { Train, TrainInstance } from '../models';
import { engine } from '../services/runtime';
import { instanceStatus } from '../services/status';
import { searchTrains, stationTimes } from '../services/trains';
import { HttpError } from '../utils/httpError';

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

export async function listTrains(req: Request, res: Response) {
  const trains = await searchTrains({
    q: str(req.query.q),
    line: str(req.query.line),
    type: str(req.query.type),
    direction: str(req.query.direction),
    from: str(req.query.from),
    to: str(req.query.to),
  });
  res.json({ simulated: true, label: 'SIMULATED TRAIN TIMETABLE', count: trains.length, trains });
}

export async function getTrain(req: Request, res: Response) {
  const train: any = await Train.findById(req.params.id).populate('stations').lean();
  if (!train) throw new HttpError(404, 'Train not found');
  const instance = await TrainInstance.findOne({ train: train._id }).select('_id').lean();
  const { stations, ...rest } = train;
  res.json({ ...rest, stations: stationTimes(train), instanceId: instance ? String(instance._id) : null, simulated: true });
}

export async function trainStatus(req: Request, res: Response) {
  const instance = await TrainInstance.findOne({ train: req.params.id }).select('_id').lean();
  if (!instance) throw new HttpError(404, 'No running instance for this train');
  const id = String(instance._id);
  const [crowd, delay] = await Promise.all([instanceStatus('crowd', id), instanceStatus('delay', id)]);
  res.json({ instanceId: id, position: engine().get(id), crowd, delay });
}
