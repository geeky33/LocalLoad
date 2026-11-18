import { CrowdLevel, DelayCategory } from '../types';

/**
 * Simple crowd model used by the seed (sample history) and by the simulated commuters.
 * It is NOT a prediction - just a believable pattern based on the current Mumbai time:
 * morning/evening rush is busy, trains towards town are busier in the morning, weekends lighter.
 */
export const HUBS = ['Dadar', 'Andheri', 'Kurla', 'Thane', 'Borivali', 'Ghatkopar', 'Bandra', 'CSMT', 'Churchgate', 'Vashi'];

const IST_OFFSET_MS = 5.5 * 3600_000;

/** Current hour (0-23) and weekend flag in India Standard Time. */
export function istClock(date = new Date()) {
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return { hour: ist.getUTCHours(), weekend: [0, 6].includes(ist.getUTCDay()) };
}

/** 0 = empty, ~1 = packed. */
export function crowdIndex(hour: number, direction: string, type: string, station: string, weekend: boolean) {
  let ci = hour >= 8 && hour <= 10 ? 0.8 : hour >= 17 && hour <= 20 ? 0.8 : [7, 11, 16, 21].includes(hour) ? 0.55 : 0.25;
  const morning = hour < 13;
  ci += (morning ? direction === 'up' : direction === 'down') ? 0.1 : -0.1; // towards town in the morning
  if (type === 'fast') ci += 0.08;
  if (HUBS.includes(station)) ci += 0.1;
  if (weekend) ci -= 0.25;
  return ci;
}

export const levelFromIndex = (x: number): CrowdLevel => (x > 0.7 ? 'red' : x > 0.4 ? 'yellow' : 'green');

export const delayFromIndex = (x: number): DelayCategory => (x > 0.85 ? '10-plus' : x > 0.65 ? '5-10' : x > 0.45 ? '1-5' : 'on-time');
