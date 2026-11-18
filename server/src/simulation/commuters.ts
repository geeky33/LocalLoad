import { User } from '../models';
import { crowdIndex, delayFromIndex, istClock, levelFromIndex } from '../services/crowdModel';
import { submitReport } from '../services/reports';
import { recentVotes } from '../services/status';
import { CROWD_LEVELS, CrowdLevel } from '../types';
import { SimulationEngine } from './engine';

/**
 * SIMULATED COMMUTERS (demo accounts "commuter1..15@localload.dev", flagged isDemo).
 * Every few seconds a small group of them "standing on the platform" reports the crowd
 * for a running train at the station it is at right now:
 *   - the level follows the CURRENT Mumbai time (rush hour → mostly red, afternoon → green),
 *   - each commuter agrees with the expected level ~75% of the time, otherwise picks a neighbour,
 *   - reports go through the normal report service, so the 10-minute window, duplicate checks
 *     and five-user verification apply exactly as for real users.
 * Their reports never trigger route alerts, and trains in SIM_COMMUTER_SKIP_TRAINS (default 90101)
 * are left alone so the live five-user demo always starts from 0/5.
 */
export const COMMUTER_EMAIL = /^commuter\d+@localload\.dev$/;

export class CommuterSimulator {
  private timer: NodeJS.Timeout | null = null;
  public reportsSent = 0;

  constructor(
    private engine: SimulationEngine,
    public intervalMs: number,
    private skipTrains: Set<string>,
  ) {}

  get running() {
    return this.timer !== null;
  }

  start() {
    if (this.timer) return;
    void this.warmUp();
    this.timer = setInterval(() => void this.runOnce().catch((e) => console.error('[commuters]', e.message)), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Fill the feed straight away after startup: a few trains get a burst of reports. */
  async warmUp(rounds = 5) {
    for (let i = 0; i < rounds; i++) await this.runOnce().catch(() => {});
  }

  /** One group of commuters reports on one randomly chosen running train. Returns reports stored. */
  async runOnce(): Promise<number> {
    const commuters = await User.find({ email: COMMUTER_EMAIL }).select('_id').lean();
    if (!commuters.length) return 0; // run `npm run seed` to create them

    const trains = this.engine.all().filter((t) => !this.skipTrains.has(t.number) && t.status !== 'completed');
    if (!trains.length) return 0;
    const t = trains[Math.floor(Math.random() * trains.length)];
    const station = t.currentStation ?? t.previousStation; // the platform the train is at / just left

    const already = new Set((await recentVotes('crowd', t.instanceId, station.id)).map((v: { user: string }) => v.user));
    const group = shuffle(commuters.filter((c) => !already.has(String(c._id)))).slice(0, 3 + Math.floor(Math.random() * 4));

    const { hour, weekend } = istClock();
    const ci = crowdIndex(hour, t.direction, t.type, station.name, weekend);
    const expected = levelFromIndex(ci);
    let stored = 0;

    for (const c of group) {
      try {
        await submitReport('crowd', String(c._id), t.instanceId, station.id, vote(expected), { notify: false });
        stored++;
      } catch {
        // 409 duplicate etc. - just skip this commuter
      }
    }

    // Sometimes the same group also reports how late the train is.
    if (Math.random() < 0.25) {
      for (const c of group) {
        const late = delayFromIndex(ci + (Math.random() - 0.5) * 0.3);
        await submitReport('delay', String(c._id), t.instanceId, station.id, late, { notify: false }).catch(() => {});
      }
    }
    this.reportsSent += stored;
    return stored;
  }
}

function vote(expected: CrowdLevel): CrowdLevel {
  if (Math.random() < 0.75) return expected;
  const i = CROWD_LEVELS.indexOf(expected);
  const neighbours = CROWD_LEVELS.filter((_, j) => Math.abs(j - i) === 1);
  return neighbours[Math.floor(Math.random() * neighbours.length)];
}

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}
