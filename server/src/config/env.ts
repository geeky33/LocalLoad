import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

let jwtSecret = process.env.JWT_SECRET || '';
if (!jwtSecret) {
  if (process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production');
  console.warn('[env] JWT_SECRET not set - using an insecure development secret');
  jwtSecret = 'dev-only-insecure-secret';
}

export const env = {
  port: num(process.env.PORT, 4000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/localload',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  simIntervalMs: num(process.env.SIMULATION_INTERVAL_MS, 3000),
  simMultiplier: num(process.env.SIMULATION_SPEED_MULTIPLIER, 10),
  simAutostart: process.env.SIMULATION_AUTOSTART !== 'false',
  simCommuters: process.env.SIMULATED_COMMUTERS !== 'false',
  simCommuterIntervalMs: num(process.env.SIM_COMMUTER_INTERVAL_MS, 8000),
  simCommuterSkip: new Set((process.env.SIM_COMMUTER_SKIP_TRAINS ?? '90101').split(',').map((s) => s.trim()).filter(Boolean)),
  nearbyAlertCooldownMs: num(process.env.NEARBY_ALERT_COOLDOWN_MS, 60000),
  reportWindowMs: num(process.env.REPORT_WINDOW_MINUTES, 10) * 60_000,
  verificationThreshold: num(process.env.VERIFICATION_THRESHOLD, 5),
};
