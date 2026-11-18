import bcrypt from 'bcryptjs';
import mongoose, { Types } from 'mongoose';
import { connectDB } from '../config/db';
import { env } from '../config/env';
import { CrowdReport, DelayReport, Station, Train, TrainInstance, User } from '../models';
import { windowBucket } from '../services/verification';
import { CROWD_LEVELS, DELAY_CATEGORIES } from '../types';
import { crowdIndex } from '../services/crowdModel';
import { LINE_DATA, TRAINS } from './data';

/**
 * Idempotent seed: stations/trains/instances/users are upserted by their unique keys,
 * and sample historical reports (isSample: true) are deleted and regenerated from a
 * fixed random seed, so running it again produces the same data with no duplicates.
 */

// Small deterministic PRNG (mulberry32) so sample data is reproducible.
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const IST_OFFSET_MS = 5.5 * 3600_000;
/** A Date for `daysAgo` days back at hour:minute India time. */
function istDate(daysAgo: number, hour: number, minute: number) {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const utc = Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), nowIst.getUTCDate() - daysAgo, hour, minute);
  return new Date(utc - IST_OFFSET_MS);
}

export async function seedStations() {
  const ops = Object.entries(LINE_DATA).flatMap(([line, data]) =>
    data.stations.map(([name, code, lat, lng], i) => ({
      updateOne: {
        filter: { code: `${data.prefix}-${code}` },
        update: { $set: { name, code: `${data.prefix}-${code}`, line, lat, lng, sequence: i + 1 } },
        upsert: true,
      },
    })),
  );
  await Station.bulkWrite(ops);
  return Station.countDocuments();
}

export async function seedTrains() {
  const stations = await Station.find().lean();
  const byCode = new Map(stations.map((s) => [s.code, s]));

  for (const t of TRAINS) {
    const data = LINE_DATA[t.line];
    const all = data.stations.map((s) => s[1]);
    const a = all.indexOf(t.from);
    const b = all.indexOf(t.to);
    if (a === -1 || b === -1) throw new Error(`Bad station code in train ${t.number}`);
    const direction = a < b ? 'down' : 'up';
    let codes = a < b ? all.slice(a, b + 1) : all.slice(b, a + 1).reverse();
    if (t.type === 'fast') codes = codes.filter((c) => (data.fastStops as readonly string[]).includes(c));
    const ids = codes.map((c) => byCode.get(`${data.prefix}-${c}`)!._id);
    const src = byCode.get(`${data.prefix}-${t.from}`)!;
    const dst = byCode.get(`${data.prefix}-${t.to}`)!;
    await Train.updateOne(
      { number: t.number },
      {
        $set: {
          number: t.number,
          name: `${src.name} – ${dst.name} ${t.type === 'fast' ? 'Fast' : 'Slow'}`,
          line: t.line,
          type: t.type,
          direction,
          source: src._id,
          destination: dst._id,
          stations: ids,
          departureTime: t.departure,
          durationMin: t.durationMin,
        },
      },
      { upsert: true },
    );
  }
  return Train.countDocuments();
}

/** One running instance per train, spread out along their routes so the demo map is lively. */
export async function seedInstances() {
  const trains = await Train.find().sort({ number: 1 }).lean();
  await TrainInstance.deleteMany({ train: { $nin: trains.map((t) => t._id) } });
  for (const [i, t] of trains.entries()) {
    const segments = t.stations.length - 1;
    const segmentIndex = (i * 3) % segments;
    const s = await Station.findById(t.stations[segmentIndex]).lean();
    await TrainInstance.updateOne(
      { train: t._id },
      {
        $set: {
          status: 'running',
          segmentIndex,
          segmentProgress: 0.25,
          dwellTicks: 0,
          lat: s!.lat,
          lng: s!.lng,
          speedKmph: 0,
          lastUpdated: new Date(),
        },
      },
      { upsert: true },
    );
  }
  return TrainInstance.countDocuments();
}

export async function seedUsers() {
  const password = process.env.SEED_DEMO_PASSWORD;
  if (!password) throw new Error('Set SEED_DEMO_PASSWORD in server/.env before seeding demo users');
  const hash = await bcrypt.hash(password, 10);
  const accounts = [
    { name: 'Admin Demo', email: 'admin@localload.dev', role: 'admin' },
    ...Array.from({ length: 8 }, (_, i) => ({ name: `Rider ${i + 1}`, email: `rider${i + 1}@localload.dev`, role: 'user' })),
  ];
  // Simulated commuters who report crowds live (see simulation/commuters.ts)
  const COMMUTER_NAMES = [
    'Aarav Shah', 'Diya Patel', 'Kabir Mehta', 'Ananya Iyer', 'Rohan Desai', 'Sneha Kulkarni', 'Vihaan Rao', 'Isha Joshi',
    'Arjun Nair', 'Meera Pillai', 'Aditya Kamat', 'Pooja Sawant', 'Nikhil Gupta', 'Tanvi Shetty', 'Siddharth Jain',
  ];
  const commuters = COMMUTER_NAMES.map((name, i) => ({ name, email: `commuter${i + 1}@localload.dev`, role: 'user' }));

  for (const a of [...accounts, ...commuters]) {
    // $setOnInsert: never overwrite an existing account's password or points
    await User.updateOne(
      { email: a.email },
      { $setOnInsert: { ...a, passwordHash: hash }, $set: { isDemo: true } },
      { upsert: true },
    );
  }
  return User.find({ email: { $in: accounts.filter((a) => a.role === 'user').map((a) => a.email) } }).lean();
}


export async function seedHistory(riders: { _id: Types.ObjectId }[]) {
  await CrowdReport.deleteMany({ isSample: true });
  await DelayReport.deleteMany({ isSample: true });

  const rand = rng(858);
  const pick = <T>(arr: readonly T[]) => arr[Math.floor(rand() * arr.length)];
  const instances = await TrainInstance.find().populate({ path: 'train', populate: { path: 'stations', select: 'name' } }).lean();
  const crowd: any[] = [];
  const delay: any[] = [];
  const HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 06:00 - 22:00

  for (let day = 1; day <= 28; day++) {
    for (const inst of instances as any[]) {
      const train = inst.train;
      const hours = [...HOURS].sort(() => rand() - 0.5).slice(0, 4);
      for (const hour of hours) {
        const station = pick(train.stations) as any;
        const at = istDate(day, hour, Math.floor(rand() * 50));
        const weekend = [0, 6].includes(new Date(at.getTime() + IST_OFFSET_MS).getUTCDay());
        const ci = crowdIndex(hour, train.direction, train.type, station.name, weekend);
        const voters = [...riders].sort(() => rand() - 0.5).slice(0, 3 + Math.floor(rand() * 4));
        for (const u of voters) {
          const r = ci + (rand() - 0.5) * 0.5;
          const reportedAt = new Date(at.getTime() + Math.floor(rand() * 120_000));
          crowd.push({
            user: u._id,
            trainInstance: inst._id,
            train: train._id,
            station: station._id,
            level: r > 0.7 ? CROWD_LEVELS[2] : r > 0.4 ? CROWD_LEVELS[1] : CROWD_LEVELS[0],
            reportedAt,
            windowBucket: windowBucket(at, env.reportWindowMs),
            isSample: true,
          });
        }
        // one delay report per slot from the first voter
        const late = ci + (rand() - 0.5) * 0.6;
        delay.push({
          user: voters[0]._id,
          trainInstance: inst._id,
          train: train._id,
          station: station._id,
          category: late > 0.85 ? DELAY_CATEGORIES[3] : late > 0.65 ? DELAY_CATEGORIES[2] : late > 0.45 ? DELAY_CATEGORIES[1] : DELAY_CATEGORIES[0],
          reportedAt: at,
          windowBucket: windowBucket(at, env.reportWindowMs),
          isSample: true,
        });
      }
    }
  }
  await CrowdReport.insertMany(crowd);
  await DelayReport.insertMany(delay);
  return { crowd: crowd.length, delay: delay.length };
}

async function main() {
  await connectDB(env.mongoUri);
  console.log('stations :', await seedStations());
  console.log('trains   :', await seedTrains());
  console.log('instances:', await seedInstances());
  const riders = await seedUsers();
  console.log('demo users: admin@localload.dev, rider1..rider8@localload.dev, commuter1..commuter15@localload.dev (password = SEED_DEMO_PASSWORD)');
  const h = await seedHistory(riders);
  console.log(`sample history: ${h.crowd} crowd reports, ${h.delay} delay reports (isSample=true)`);
  await mongoose.disconnect();
  console.log('Seed complete.');
}

if (require.main === module) {
  main().catch(async (err) => {
    console.error('Seed failed:', err);
    await mongoose.disconnect();
    process.exit(1);
  });
}
