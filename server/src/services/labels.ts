import { CrowdLevel, DelayCategory } from '../types';

export const CROWD_LABELS: Record<CrowdLevel, string> = {
  green: 'Low crowd',
  yellow: 'Moderate crowd',
  red: 'High crowd',
};

export const DELAY_LABELS: Record<DelayCategory, string> = {
  'on-time': 'On time',
  '1-5': '1–5 min late',
  '5-10': '5–10 min late',
  '10-plus': '10+ min late',
  'not-arrived': 'Train not arrived',
  cancelled: 'Cancelled (reported)',
};
