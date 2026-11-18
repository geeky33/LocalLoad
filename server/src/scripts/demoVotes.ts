/**
 * Demo helper for five-user verification.
 * Logs in as the seeded rider accounts through the REAL API and submits one report each.
 *
 *   npm run demo:votes -- 90101 Dadar red,red,red,green,yellow
 *   npm run demo:votes -- 95102 Thane 10-plus,10-plus,5-10,10-plus,10-plus delay
 *   FIRST_RIDER=4 npm run demo:votes -- 90101 Dadar red      (votes as rider4 instead of rider1)
 *
 * Needs the server running and `npm run seed` done. API URL: API_URL (default http://localhost:4000/api).
 */
import 'dotenv/config';

const API = process.env.API_URL || 'http://localhost:4000/api';
const [trainNumber, stationName, valuesArg, kind = 'crowd'] = process.argv.slice(2);
const FIRST = Math.max(1, Number(process.env.FIRST_RIDER) || 1); // which demo rider casts the first vote

async function call(path: string, init: RequestInit = {}, token?: string) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const body = res.status === 204 ? null : await res.json();
  return { status: res.status, body };
}

async function main() {
  if (!trainNumber || !stationName || !valuesArg) {
    console.log('Usage: npm run demo:votes -- <trainNumber> <stationName> <v1,v2,...> [crowd|delay]');
    process.exit(1);
  }
  const values = valuesArg.split(',');
  if (FIRST + values.length - 1 > 8) throw new Error('Only 8 demo riders (rider1..rider8) are seeded');

  const list = await call(`/trains?q=${trainNumber}`);
  const train = list.body.trains.find((t: any) => t.number === trainNumber);
  if (!train) throw new Error(`Train ${trainNumber} not found`);
  const detail = await call(`/trains/${train._id}`);
  const station = detail.body.stations.find((s: any) => s.name.toLowerCase() === stationName.toLowerCase());
  if (!station) throw new Error(`${stationName} is not a halt of ${train.name}`);

  for (const [n, value] of values.entries()) {
    const i = n + FIRST - 1;
    const login = await call('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: `rider${i + 1}@localload.dev`, password: process.env.SEED_DEMO_PASSWORD }),
    });
    if (login.status !== 200) throw new Error(`Login failed for rider${i + 1}: ${login.body.error}`);
    const field = kind === 'delay' ? 'category' : 'level';
    const r = await call(
      `/reports/${kind}`,
      { method: 'POST', body: JSON.stringify({ trainInstanceId: train.instanceId, stationId: station._id, [field]: value }) },
      login.body.token,
    );
    const v = r.body.verdict;
    console.log(`rider${i + 1} -> ${value.padEnd(8)} [${r.status}] ${v ? `${v.state.toUpperCase()} ${v.value ?? ''} | ${v.message}` : r.body.error}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
