/**
 * FIVE-USER VERIFICATION
 * ----------------------
 * A crowd (or delay) status is only "confirmed" when:
 *   1. only reports inside the reporting window (default 10 min) are counted,
 *   2. each user counts once (their most recent report in the window),
 *   3. at least `threshold` (default 5) DISTINCT users have reported, and
 *   4. one value has a STRICT majority (> 50%) of those reports.
 * Fewer than 5 users  -> "unverified" (distribution shown as provisional).
 * No strict majority  -> "mixed".
 * This function is pure so it can be unit-tested without a database.
 */

export type VerdictState = 'none' | 'unverified' | 'confirmed' | 'mixed';

export interface VoteInput<T extends string> {
  user: string;
  value: T;
  reportedAt: Date;
}

export interface Verdict<T extends string> {
  state: VerdictState;
  value: T | null; // only set when state === 'confirmed'
  total: number;
  threshold: number;
  distribution: Record<T, number>;
  lastUpdated: Date | null;
  message: string;
}

export interface VerdictOptions<T extends string> {
  categories: readonly T[];
  threshold: number;
  windowMs: number;
  now?: Date;
}

export function computeVerdict<T extends string>(votes: VoteInput<T>[], opts: VerdictOptions<T>): Verdict<T> {
  const now = (opts.now ?? new Date()).getTime();
  const windowStart = now - opts.windowMs;

  // Steps 1 + 2: keep only recent votes, and only the latest vote per user.
  const latestByUser = new Map<string, VoteInput<T>>();
  for (const v of votes) {
    const t = v.reportedAt.getTime();
    if (t < windowStart || t > now) continue;
    const prev = latestByUser.get(v.user);
    if (!prev || prev.reportedAt.getTime() < t) latestByUser.set(v.user, v);
  }
  const valid = [...latestByUser.values()];

  const distribution = Object.fromEntries(opts.categories.map((c) => [c, 0])) as Record<T, number>;
  for (const v of valid) distribution[v.value] = (distribution[v.value] ?? 0) + 1;

  const total = valid.length;
  const lastUpdated = total ? new Date(Math.max(...valid.map((v) => v.reportedAt.getTime()))) : null;
  const base = { total, threshold: opts.threshold, distribution, lastUpdated };

  if (total === 0) {
    return { ...base, state: 'none', value: null, message: `No reports yet — 0/${opts.threshold} reports received.` };
  }
  // Step 3: not enough distinct users yet.
  if (total < opts.threshold) {
    return {
      ...base,
      state: 'unverified',
      value: null,
      message: `Insufficient reports — ${total}/${opts.threshold} reports received.`,
    };
  }
  // Step 4: strict majority (count * 2 > total). A tie can never be a strict majority.
  const winner = opts.categories.find((c) => distribution[c] * 2 > total);
  if (!winner) {
    return { ...base, state: 'mixed', value: null, message: 'Mixed reports — no clear consensus.' };
  }
  return { ...base, state: 'confirmed', value: winner, message: `Confirmed by ${distribution[winner]} of ${total} reports.` };
}

/** Window bucket used by the unique index to block duplicate votes at the database level. */
export const windowBucket = (date: Date, windowMs: number) => Math.floor(date.getTime() / windowMs);
