import http from 'http';
import mongoose from 'mongoose';
import { createApp } from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { runtime } from './services/runtime';
import { handleArrival } from './services/nearbyAlerts';
import { CommuterSimulator } from './simulation/commuters';
import { SimulationEngine } from './simulation/engine';
import { initSockets } from './sockets';

export async function startServer(opts: { port?: number; mongoUri?: string; autostart?: boolean } = {}) {
  await connectDB(opts.mongoUri ?? env.mongoUri);

  const engine = new SimulationEngine(env.simIntervalMs, env.simMultiplier);
  const count = await engine.load();
  runtime.engine = engine;
  const commuters = new CommuterSimulator(engine, env.simCommuterIntervalMs, env.simCommuterSkip);
  runtime.commuters = commuters;

  const server = http.createServer(createApp());
  runtime.io = initSockets(server, engine);
  engine.onArrival((update, station) => void handleArrival(update, station).catch((e) => console.error('[nearby]', e.message)));

  await new Promise<void>((resolve, reject) => {
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        err.message = `Port ${opts.port ?? env.port} is already in use - another LocalLoad server is probably running. Stop it (Ctrl+C in its terminal, or: kill $(lsof -t -i :${opts.port ?? env.port})) or change PORT in .env`;
      }
      reject(err);
    });
    server.listen(opts.port ?? env.port, '0.0.0.0', resolve);
  });
  if (opts.autostart ?? env.simAutostart) {
    engine.start();
    if (env.simCommuters) commuters.start();
  }

  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : opts.port;
  console.log(`[server] LocalLoad API on http://0.0.0.0:${port}  (${count} simulated trains, running=${engine.running}, simulated commuters=${commuters.running})`);
  if (count === 0) console.log('[server] No trains found - run `npm run seed` first.');

  const close = async () => {
    engine.stop();
    commuters.stop();
    runtime.io?.close();
    await new Promise((r) => server.close(r));
    await mongoose.disconnect();
  };
  return { server, engine, commuters, port: port as number, close };
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('[server] failed to start:', err.message);
    process.exit(1);
  });
}
