import { CrowdLevel, DelayCategory } from '../types';

export const CROWD_INFO: Record<CrowdLevel, { label: string; hint: string }> = {
  green: { label: 'Low crowd', hint: 'Comfortable to board' },
  yellow: { label: 'Moderate', hint: 'Standing passengers' },
  red: { label: 'High crowd', hint: 'Extremely crowded' },
};

export const DELAY_LABELS: Record<DelayCategory, string> = {
  'on-time': 'On time',
  '1-5': '1–5 min late',
  '5-10': '5–10 min late',
  '10-plus': '10+ min late',
  'not-arrived': 'Not arrived',
  cancelled: 'Cancelled (reported)',
};

export const DELAY_OPTIONS = Object.keys(DELAY_LABELS) as DelayCategory[];

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return '—';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return `${Math.floor(s / 3600)} h ago`;
}

export function clock(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function hourLabel(h: number) {
  const suffix = h < 12 ? 'am' : 'pm';
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}${suffix}`;
}

/** Crowd score 1 (green) .. 3 (red) -> level used for colouring charts. */
export function scoreLevel(score: number): CrowdLevel {
  return score >= 2.3 ? 'red' : score >= 1.7 ? 'yellow' : 'green';
}

export function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
