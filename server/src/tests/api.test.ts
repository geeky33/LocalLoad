/**
 * Integration tests: real Express app + Socket.IO + simulation engine, against an
 * in-memory MongoDB (mongodb-memory-server). Run with `npm test`.
 */
process.env.SEED_DEMO_PASSWORD = 'test-password';
process.env.JWT_SECRET = 'test-secret';

import { existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { io as ioClient } from 'socket.io-client';
import request from 'supertest';
import { CrowdReport } from '../models';
import { seedInstances, seedStations, seedTrains, seedUsers } from '../seed/seed';
import { handleArrival, resetNearbyCooldowns } from '../services/nearbyAlerts';
import { startServer } from '../server';

let mongo: MongoMemoryServer;
let app: Awaited<ReturnType<typeof startServer>>;
let api: ReturnType<typeof request>;
let train: any;
let station: any;
const tokens: string[] = [];

async function signup(i: number) {
  const res = await api.post('/api/auth/register').send({ name: `Tester ${i}`, email: `tester${i}@test.dev`, password: 'secret123' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.token as string;
}
const report = (token: string, level: string, stationId = station._id) =>
  api.post('/api/reports/crowd').set('Authorization', `Bearer ${token}`).send({ trainInstanceId: train.instanceId, stationId, level });

before(async () => {
  // dbPath in RAM (/dev/shm on Linux) and a low index-build disk threshold keep tests independent of free disk space.
  const shm = '/dev/shm';
  const dbPath = existsSync(shm) ? mkdtempSync(join(shm, 'localload-test-')) : undefined;
  mongo = await MongoMemoryServer.create({
    instance: { dbPath, args: ['--setParameter', 'indexBuildMinAvailableDiskSpaceMB=10'] },
  });
  app = await startServer({ mongoUri: mongo.getUri(), port: 0, autostart: false });
  await seedStations();
  await seedTrains();
  await seedInstances();
  await seedUsers();
  await app.engine.load();
  api = request(app.server);
});

after(async () => {
  await app?.close();
  await mongo?.stop({ doCleanup: true, force: true });
});

describe('auth', () => {
  it('signs up, logs in, rejects bad credentials and duplicates', async () => {
    tokens.push(await signup(1));
    const dup = await api.post('/api/auth/register').send({ name: 'Again', email: 'TESTER1@test.dev', password: 'secret123' });
    assert.equal(dup.status, 409);

    const bad = await api.post('/api/auth/register').send({ name: 'X', email: 'nope', password: '1' });
    assert.equal(bad.status, 400);

    const ok = await api.post('/api/auth/login').send({ email: 'tester1@test.dev', password: 'secret123' });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);
    assert.equal(ok.body.user.passwordHash, undefined);

    const wrong = await api.post('/api/auth/login').send({ email: 'tester1@test.dev', password: 'wrong-pass' });
    assert.equal(wrong.status, 401);
  });

  it('protects private routes', async () => {
    assert.equal((await api.get('/api/auth/me')).status, 401);
    assert.equal((await api.get('/api/routes').set('Authorization', 'Bearer garbage')).status, 401);
    const me = await api.get('/api/auth/me').set('Authorization', `Bearer ${tokens[0]}`);
    assert.equal(me.status, 200);
    assert.equal(me.body.user.email, 'tester1@test.dev');
  });

  it('blocks normal users from simulation controls', async () => {
    assert.equal((await api.post('/api/admin/simulation/stop').set('Authorization', `Bearer ${tokens[0]}`)).status, 403);
    const admin = await api.post('/api/auth/login').send({ email: 'admin@localload.dev', password: 'test-password' });
    const status = await api.get('/api/admin/simulation/status').set('Authorization', `Bearer ${admin.body.token}`);
    assert.equal(status.status, 200);
    assert.equal(status.body.trains.length, 13);
  });
});

describe('trains & tracking', () => {
  it('lists and searches the simulated timetable', async () => {
    const all = await api.get('/api/trains');
    assert.equal(all.body.count, 13);
    assert.equal(all.body.label, 'SIMULATED TRAIN TIMETABLE');

    const search = await api.get('/api/trains/search').query({ from: 'Dadar', to: 'Andheri', type: 'fast' });
    assert.ok(search.body.count >= 1);
    for (const t of search.body.trains) assert.equal(t.direction, 'down');

    const none = await api.get('/api/trains/search').query({ from: 'Andheri', to: 'Thane' });
    assert.equal(none.body.count, 0); // different lines

    // Nearest station: a point just next to Dadar returns Dadar, merged across Western + Central.
    const near = await api.get('/api/stations/nearest').query({ lat: 19.0185, lng: 72.843 });
    assert.equal(near.status, 200);
    assert.equal(near.body.nearest[0].name, 'Dadar');
    assert.deepEqual([...near.body.nearest[0].lines].sort(), ['central', 'western']);
    assert.equal(near.body.outOfArea, false);
    assert.equal((await api.get('/api/stations/nearest').query({ lat: 28.6, lng: 77.2 })).body.outOfArea, true); // Delhi
    assert.equal((await api.get('/api/stations/nearest').query({ lat: 'abc', lng: 72 })).status, 400);

    train = all.body.trains.find((t: any) => t.number === '90101');
    const detail = await api.get(`/api/trains/${train._id}`);
    station = detail.body.stations.find((s: any) => s.name === 'Dadar');
    assert.ok(station);
  });

  it('moves trains along the route and broadcasts over Socket.IO', async () => {
    const before = (await api.get(`/api/tracking/${train.instanceId}`)).body.position;
    const socket = ioClient(`http://127.0.0.1:${app.port}`, { transports: ['websocket'] });
    const updates: any[] = [];
    socket.on('train-position-update', (u) => updates.push(u));
    await new Promise<void>((r) => socket.on('connect', () => r()));
    socket.emit('join-train', train.instanceId);
    await new Promise((r) => setTimeout(r, 100));

    for (let i = 0; i < 5; i++) await app.engine.tick();
    await new Promise((r) => setTimeout(r, 100));
    socket.disconnect();

    assert.ok(updates.length >= 5, `expected updates, got ${updates.length}`);
    assert.ok(updates.every((u) => u.instanceId === train.instanceId)); // only the joined train
    const last = updates[updates.length - 1];
    assert.equal(last.simulated, true);
    assert.notDeepEqual(last.position, before.position);
    assert.ok(last.previousStation.name);
    assert.ok(last.journeyProgress > before.journeyProgress || last.previousStation.name !== before.previousStation.name);
  });
});

describe('crowd reporting & five-user verification', () => {
  it('needs five distinct users and blocks duplicates', async () => {
    for (let i = 2; i <= 6; i++) tokens.push(await signup(i));

    let r = await report(tokens[0], 'red');
    assert.equal(r.status, 201);
    assert.equal(r.body.verdict.state, 'unverified');

    const dup = await report(tokens[0], 'green');
    assert.equal(dup.status, 409); // duplicate vote rejected
    assert.equal(await CrowdReport.countDocuments({ isSample: false }), 1);

    await report(tokens[1], 'green');
    await report(tokens[2], 'yellow');
    r = await report(tokens[3], 'red');
    assert.equal(r.body.verdict.state, 'unverified');
    assert.equal(r.body.verdict.message, 'Insufficient reports — 4/5 reports received.');

    r = await report(tokens[4], 'red');
    assert.equal(r.body.verdict.state, 'confirmed'); // G1 Y1 R3
    assert.equal(r.body.verdict.value, 'red');

    const status = await api.get(`/api/crowd/status/${train.instanceId}`);
    assert.equal(status.body.summary.state, 'confirmed');
    assert.equal(status.body.summary.total, 5);
  });

  it('reports mixed when there is no strict majority', async () => {
    const other = (await api.get(`/api/trains/${train._id}`)).body.stations.find((s: any) => s.name === 'Andheri');
    const levels = ['green', 'green', 'yellow', 'yellow', 'red', 'red'];
    let last: any;
    for (const [i, level] of levels.entries()) last = await report(tokens[i], level, other._id);
    assert.equal(last.body.verdict.state, 'mixed');
  });

  it('rejects a station that is not on the route', async () => {
    const stations = (await api.get('/api/stations?line=harbour')).body;
    const r = await report(tokens[0], 'red', stations[3]._id);
    assert.equal(r.status, 400);
  });

  it('verifies delays with the same threshold', async () => {
    let r: any;
    for (let i = 0; i < 5; i++) {
      r = await api
        .post('/api/reports/delay')
        .set('Authorization', `Bearer ${tokens[i]}`)
        .send({ trainInstanceId: train.instanceId, stationId: station._id, category: i < 3 ? '5-10' : 'on-time' });
    }
    assert.equal(r.body.verdict.state, 'confirmed');
    assert.equal(r.body.verdict.value, '5-10');
  });
});

describe('saved routes', () => {
  it('supports create, read, update, delete and alerts on confirmed changes', async () => {
    const stations = (await api.get('/api/stations?line=western')).body;
    const dadar = stations.find((s: any) => s.name === 'Dadar');
    const borivali = stations.find((s: any) => s.name === 'Borivali');
    const auth = { Authorization: `Bearer ${tokens[5]}` };
    const body = { name: 'Office', sourceId: dadar._id, destinationId: borivali._id, preferredTime: '08:30', line: 'western' };

    const created = await api.post('/api/routes').set(auth).send(body);
    assert.equal(created.status, 201);
    const list = await api.get('/api/routes').set(auth);
    assert.equal(list.body.length, 1);
    assert.ok(list.body[0].trains.length >= 1);

    const updated = await api.put(`/api/routes/${created.body._id}`).set(auth).send({ ...body, name: 'Work', preference: 'fast' });
    assert.equal(updated.body.name, 'Work');

    // Five users confirm crowding at Borivali on 90101 -> the route owner gets a notification.
    const bvi = (await api.get(`/api/trains/${train._id}`)).body.stations.find((s: any) => s.name === 'Borivali');
    for (let i = 0; i < 5; i++) await report(tokens[i], 'yellow', bvi._id);
    const notes = await api.get('/api/notifications').set(auth);
    assert.equal(notes.body.length, 1);
    assert.match(notes.body[0].body, /Moderate crowd confirmed/);

    // Turning crowd alerts off stops further crowd notifications.
    const settings = await api.put('/api/notifications/settings').set(auth).send({ crowd: false });
    assert.equal(settings.status, 200);
    assert.equal(settings.body.crowd, false);
    const bandra = (await api.get(`/api/trains/${train._id}`)).body.stations.find((s: any) => s.name === 'Bandra');
    let last: any;
    for (let i = 0; i < 5; i++) last = await report(tokens[i], 'red', bandra._id);
    assert.equal(last.body.verdict.state, 'confirmed'); // a real confirmed change happened...
    assert.equal((await api.get('/api/notifications').set(auth)).body.length, 1); // ...but no new alert

    assert.equal((await api.delete(`/api/routes/${created.body._id}`).set(auth)).status, 204);
    assert.equal((await api.get('/api/routes').set(auth)).body.length, 0);
  });
});

describe('simulated commuters & live crowd feed', () => {
  it('fills the feed in real time with named reporters, never touching the demo train', async () => {
    let stored = 0;
    for (let i = 0; i < 4; i++) stored += await app.commuters.runOnce();
    assert.ok(stored >= 3, `commuters should have reported, got ${stored}`);

    const feed = await api.get('/api/crowd/recent').query({ limit: 20 });
    assert.equal(feed.status, 200);
    const commuterItems = feed.body.items.filter((i: any) => i.reporters.some((r: any) => r.demo));
    assert.ok(commuterItems.length >= 1);
    for (const item of commuterItems) {
      assert.notEqual(item.train.number, '90101'); // reserved for the live five-user demo
      assert.ok(item.reporters.length === item.total); // one reporter entry per counted vote
      assert.ok(Date.now() - new Date(item.lastUpdated).getTime() < 60_000); // timestamped "now"
    }

    // Real users appear as "First L." (no full surname), demo commuters by their demo name.
    const dadar = feed.body.items.find((i: any) => i.train.number === '90101' && i.station.name === 'Dadar');
    assert.ok(dadar);
    assert.ok(dadar.reporters.every((r: any) => r.demo === false && /^Tester \d\.$/.test(r.name)));
  });
});

describe('nearest-station alerts', () => {
  it('alerts users whose nearest station a less-crowded train reaches', async () => {
    const trains = (await api.get('/api/trains')).body.trains;
    const setup = async (number: string, level: string) => {
      const t = trains.find((x: any) => x.number === number);
      const kurla = (await api.get(`/api/trains/${t._id}`)).body.stations.find((s: any) => s.name === 'Kurla');
      for (let i = 0; i < 5; i++) {
        await api.post('/api/reports/crowd').set('Authorization', `Bearer ${tokens[i]}`).send({ trainInstanceId: t.instanceId, stationId: kurla._id, level });
      }
      return { update: app.engine.get(t.instanceId)!, stop: { id: kurla._id, name: 'Kurla', code: kurla.code, lat: kurla.lat, lng: kurla.lng } };
    };

    // The watcher (tokens[5]) says "my nearest station is Kurla" - only the name is sent.
    const socket = ioClient(`http://127.0.0.1:${app.port}`, { transports: ['websocket'], auth: { token: tokens[5] } });
    const alerts: any[] = [];
    socket.on('route-alert', (a) => alerts.push(a));
    await new Promise<void>((r) => socket.on('connect', () => r()));
    socket.emit('watch-station', 'Kurla');
    await new Promise((r) => setTimeout(r, 100));
    resetNearbyCooldowns();

    const green = await setup('95202', 'green');
    assert.equal(await handleArrival(green.update, green.stop), 1);
    await new Promise((r) => setTimeout(r, 150));
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].type, 'nearby');
    assert.match(alerts[0].title, /95202 has reached Kurla/);
    assert.match(alerts[0].body, /Low crowd/);

    assert.equal(await handleArrival(green.update, green.stop), 0); // cooldown: no repeat spam

    resetNearbyCooldowns();
    const red = await setup('95203', 'red');
    assert.equal(await handleArrival(red.update, red.stop), 0); // crowded trains never alert

    resetNearbyCooldowns();
    await api.put('/api/notifications/settings').set('Authorization', `Bearer ${tokens[5]}`).send({ nearby: false });
    assert.equal(await handleArrival(green.update, green.stop), 0); // user turned it off
    socket.disconnect();

    const notes = (await api.get('/api/notifications').set('Authorization', `Bearer ${tokens[5]}`)).body;
    assert.equal(notes.filter((n: any) => n.type === 'nearby').length, 1);
  });
});
