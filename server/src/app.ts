import cors from 'cors';
import express from 'express';
import { errorHandler, notFound } from './middleware/error';
import api from './routes';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '100kb' }));
  app.get('/health', (_req, res) => res.json({ ok: true, service: 'localload', simulated: true }));

  // Friendly landing page so opening the server URL in a browser shows it is running.
  app.get('/', (_req, res) => {
    const links = [
      ['/health', 'Health check'],
      ['/api/tracking/active', 'Live simulated train positions'],
      ['/api/trains', 'Simulated train timetable'],
      ['/api/stations', 'Stations'],
      ['/api/insights/overview', 'Insights (sample data)'],
    ];
    res.type('html').send(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LocalLoad API</title><style>
body{font-family:system-ui,sans-serif;max-width:560px;margin:40px auto;padding:0 16px;background:#F4F6FA;color:#0F1B2D}
.card{background:#fff;border-radius:14px;padding:20px;border:1px solid #E1E7F0}h1{margin:0 0 4px}
.ok{color:#16A34A;font-weight:700}a{color:#2563EB;text-decoration:none}li{margin:8px 0}small{color:#5B6B82}
@media (prefers-color-scheme:dark){body{background:#0A111F;color:#E8EEF8}.card{background:#131C2E;border-color:#24314A}a{color:#5B8CFF}small{color:#93A3BC}}
</style></head><body><div class="card"><h1>🚆 LocalLoad API</h1><p class="ok">● Server is running</p>
<p>Know your train. Beat the rush.</p><ul>${links.map(([href, label]) => `<li><a href="${href}">${label}</a> <small>${href}</small></li>`).join('')}</ul>
<small>Train positions and timetables are simulated for demonstration purposes. Open the LocalLoad app in Expo Go to use it.</small></div></body></html>`);
  });
  app.use('/api', api);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
