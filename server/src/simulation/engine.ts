import { TrainInstance } from '../models';
import { cumulativeKm, distanceKm, interpolate, LatLng } from '../utils/geo';

/**
 * SIMULATED TRAIN MOVEMENT
 * ------------------------
 * Positions are generated from station coordinates - NOT real GPS.
 * Every tick (SIMULATION_INTERVAL_MS) each train:
 *   - waits (dwells) at a station for a few ticks, then
 *   - moves along the straight segment to the next station by advancing `progress` (0 -> 1)
 *     by distance = speed x elapsed time x speed multiplier,
 *   - its lat/lng is the linear interpolation between the two stations,
 *   - when progress reaches 1 it "arrives": previous/next station shift by one.
 * At the destination it rests briefly and then restarts so the demo keeps running.
 */

const DWELL_TICKS = 2;
const TERMINUS_TICKS = 8;
const CRUISE_KMPH = { fast: 65, slow: 48 } as const;

export interface RouteStop extends LatLng {
  id: string;
  name: string;
  code: string;
}

interface SimTrain {
  instanceId: string;
  trainId: string;
  number: string;
  name: string;
  line: string;
  type: 'fast' | 'slow';
  direction: 'up' | 'down';
  route: RouteStop[];
  segKm: number[]; // length of each segment
  cumKm: number[];
  cruise: number;
  status: 'running' | 'at-station' | 'completed';
  segmentIndex: number;
  progress: number;
  dwellTicks: number;
  speed: number;
  pos: LatLng;
  lastUpdated: Date;
}

export interface PositionUpdate {
  instanceId: string;
  trainId: string;
  number: string;
  name: string;
  line: string;
  type: string;
  direction: string;
  status: SimTrain['status'];
  position: LatLng;
  currentStation: RouteStop | null; // set while stopped at a station
  previousStation: RouteStop;
  nextStation: RouteStop | null;
  distanceToNextKm: number | null;
  etaMinutes: number | null; // simulated minutes to next station
  speedKmph: number;
  journeyProgress: number; // 0..1 over the whole route
  lastUpdated: string;
  simulated: true;
}

type Listener = (update: PositionUpdate) => void;
type ArrivalListener = (update: PositionUpdate, station: RouteStop) => void;

export class SimulationEngine {
  private trains = new Map<string, SimTrain>();
  private timer: NodeJS.Timeout | null = null;
  private persisting = false;
  private listeners: Listener[] = [];
  private arrivalListeners: ArrivalListener[] = [];
  public tickCount = 0;

  constructor(
    public intervalMs: number,
    public multiplier: number,
  ) {}

  get running() {
    return this.timer !== null;
  }

  onUpdate(fn: Listener) {
    this.listeners.push(fn);
  }

  /** Called whenever a train pulls into a station (used for nearest-station alerts). */
  onArrival(fn: ArrivalListener) {
    this.arrivalListeners.push(fn);
  }

  /** Load every train instance + its ordered station list from MongoDB. */
  async load() {
    const instances = await TrainInstance.find().populate({ path: 'train', populate: { path: 'stations' } }).lean();
    this.trains.clear();
    for (const inst of instances) {
      const train = inst.train as any;
      if (!train?.stations?.length) continue;
      const route: RouteStop[] = train.stations.map((s: any) => ({
        id: String(s._id),
        name: s.name,
        code: s.code,
        lat: s.lat,
        lng: s.lng,
      }));
      const segKm = route.slice(1).map((s, i) => Math.max(0.2, distanceKm(route[i], s)));
      const segIndex = Math.min(inst.segmentIndex ?? 0, route.length - 1);
      const t: SimTrain = {
        instanceId: String(inst._id),
        trainId: String(train._id),
        number: train.number,
        name: train.name,
        line: train.line,
        type: train.type,
        direction: train.direction,
        route,
        segKm,
        cumKm: cumulativeKm(route),
        cruise: CRUISE_KMPH[train.type as 'fast' | 'slow'],
        status: (inst.status as SimTrain['status']) ?? 'at-station',
        segmentIndex: segIndex,
        progress: inst.segmentProgress ?? 0,
        dwellTicks: inst.dwellTicks ?? 0,
        speed: inst.speedKmph ?? 0,
        pos: route[segIndex],
        lastUpdated: new Date(),
      };
      this.updatePosition(t);
      this.trains.set(t.instanceId, t);
    }
    return this.trains.size;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  setMultiplier(m: number) {
    this.multiplier = m;
  }

  /** Put every train back at its starting station; departures are staggered by a few ticks. */
  async reset() {
    let i = 0;
    for (const t of this.trains.values()) {
      t.status = 'at-station';
      t.segmentIndex = 0;
      t.progress = 0;
      t.dwellTicks = DWELL_TICKS + (i++ % 5) * 3;
      t.speed = 0;
      this.updatePosition(t);
    }
    await this.persist();
    this.trains.forEach((t) => this.emit(t));
  }

  /** Advance every train by one step. Exposed so tests can drive the simulation directly. */
  async tick() {
    this.tickCount++;
    const hours = (this.intervalMs / 3_600_000) * this.multiplier; // simulated time per tick
    for (const t of this.trains.values()) {
      const arrivedAt = this.step(t, hours);
      this.emit(t);
      if (arrivedAt) {
        const update = this.snapshot(t);
        for (const fn of this.arrivalListeners) fn(update, arrivedAt);
      }
    }
    await this.persist();
  }

  /** Moves one train. Returns the station it just arrived at, if any. */
  private step(t: SimTrain, hours: number): RouteStop | null {
    t.lastUpdated = new Date();
    const last = t.route.length - 1;

    if (t.status === 'completed') {
      if (--t.dwellTicks <= 0) {
        // loop the demo: restart from the origin
        t.status = 'at-station';
        t.segmentIndex = 0;
        t.progress = 0;
        t.dwellTicks = DWELL_TICKS;
      }
      t.speed = 0;
      this.updatePosition(t);
      return null;
    }

    if (t.status === 'at-station') {
      t.speed = 0;
      if (--t.dwellTicks <= 0) t.status = 'running';
      this.updatePosition(t);
      return null;
    }

    // Running: speed follows a smooth curve - slower near stations, cruise speed mid-way.
    t.speed = t.cruise * (0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, Math.max(0, t.progress + 0.05))));
    const movedKm = t.speed * hours;
    t.progress += movedKm / t.segKm[t.segmentIndex];

    let arrivedAt: RouteStop | null = null;
    if (t.progress >= 1) {
      // Arrived at the next station.
      arrivedAt = t.route[Math.min(t.segmentIndex + 1, last)];
      t.segmentIndex += 1;
      t.progress = 0;
      t.speed = 0;
      if (t.segmentIndex >= last) {
        t.segmentIndex = last;
        t.status = 'completed';
        t.dwellTicks = TERMINUS_TICKS;
      } else {
        t.status = 'at-station';
        t.dwellTicks = DWELL_TICKS;
      }
    }
    this.updatePosition(t);
    return arrivedAt;
  }

  private updatePosition(t: SimTrain) {
    const a = t.route[t.segmentIndex];
    const b = t.route[t.segmentIndex + 1];
    t.pos = b && t.status === 'running' ? interpolate(a, b, t.progress) : { lat: a.lat, lng: a.lng };
  }

  snapshot(t: SimTrain): PositionUpdate {
    const prev = t.route[t.segmentIndex];
    const next = t.status === 'completed' ? null : (t.route[t.segmentIndex + 1] ?? null);
    const remainingKm = next ? t.segKm[t.segmentIndex] * (1 - t.progress) : null;
    const totalKm = t.cumKm[t.cumKm.length - 1] || 1;
    const doneKm = t.cumKm[t.segmentIndex] + (next ? t.segKm[t.segmentIndex] * t.progress : 0);
    return {
      instanceId: t.instanceId,
      trainId: t.trainId,
      number: t.number,
      name: t.name,
      line: t.line,
      type: t.type,
      direction: t.direction,
      status: t.status,
      position: t.pos,
      currentStation: t.status === 'running' ? null : prev,
      previousStation: prev,
      nextStation: next,
      distanceToNextKm: remainingKm === null ? null : Math.round(remainingKm * 100) / 100,
      // ETA uses an average speed of ~75% of cruise, plus the remaining dwell time.
      etaMinutes:
        remainingKm === null ? null : Math.max(1, Math.round((remainingKm / (t.cruise * 0.75)) * 60 + (t.status === 'at-station' ? 0.5 : 0))),
      speedKmph: Math.round(t.speed),
      journeyProgress: Math.min(1, doneKm / totalKm),
      lastUpdated: t.lastUpdated.toISOString(),
      simulated: true,
    };
  }

  get(instanceId: string) {
    const t = this.trains.get(instanceId);
    return t ? this.snapshot(t) : null;
  }

  routeOf(instanceId: string) {
    return this.trains.get(instanceId)?.route ?? null;
  }

  all() {
    return [...this.trains.values()].map((t) => this.snapshot(t));
  }

  private emit(t: SimTrain) {
    const update = this.snapshot(t);
    for (const fn of this.listeners) fn(update);
  }

  private async persist() {
    if (this.persisting || this.trains.size === 0) return;
    this.persisting = true;
    try {
      await TrainInstance.bulkWrite(
        [...this.trains.values()].map((t) => ({
          updateOne: {
            filter: { _id: t.instanceId },
            update: {
              $set: {
                status: t.status,
                segmentIndex: t.segmentIndex,
                segmentProgress: t.progress,
                dwellTicks: t.dwellTicks,
                lat: t.pos.lat,
                lng: t.pos.lng,
                speedKmph: Math.round(t.speed),
                lastUpdated: t.lastUpdated,
              },
            },
          },
        })),
      );
    } catch (err) {
      console.error('[simulation] failed to persist positions', err);
    } finally {
      this.persisting = false;
    }
  }
}
