import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CROWD_LEVELS, CrowdLevel } from '../types';
import { computeVerdict } from '../services/verification';

const NOW = new Date('2026-01-01T09:00:00Z');
const WINDOW = 10 * 60_000;
const opts = { categories: CROWD_LEVELS, threshold: 5, windowMs: WINDOW, now: NOW };

/** Build votes from e.g. { green: 1, yellow: 1, red: 3 } - each vote from a different user. */
function votes(counts: Partial<Record<CrowdLevel, number>>, minutesAgo = 1) {
  let n = 0;
  return Object.entries(counts).flatMap(([value, count]) =>
    Array.from({ length: count ?? 0 }, () => ({
      user: `u${++n}`,
      value: value as CrowdLevel,
      reportedAt: new Date(NOW.getTime() - minutesAgo * 60_000),
    })),
  );
}

describe('five-user crowd verification', () => {
  it('CASE 1: 5 reports G1 Y1 R3 -> confirmed red', () => {
    const v = computeVerdict(votes({ green: 1, yellow: 1, red: 3 }), opts);
    assert.equal(v.state, 'confirmed');
    assert.equal(v.value, 'red');
    assert.equal(v.total, 5);
  });

  it('CASE 2: 4 reports G1 Y1 R2 -> unverified 4/5', () => {
    const v = computeVerdict(votes({ green: 1, yellow: 1, red: 2 }), opts);
    assert.equal(v.state, 'unverified');
    assert.equal(v.value, null);
    assert.equal(v.message, 'Insufficient reports — 4/5 reports received.');
    assert.deepEqual(v.distribution, { green: 1, yellow: 1, red: 2 }); // provisional distribution still shown
  });

  it('CASE 3: 6 reports G3 Y3 -> mixed', () => {
    const v = computeVerdict(votes({ green: 3, yellow: 3 }), opts);
    assert.equal(v.state, 'mixed');
    assert.equal(v.value, null);
    assert.equal(v.message, 'Mixed reports — no clear consensus.');
  });

  it('CASE 4: same user reporting repeatedly counts once (latest vote)', () => {
    const repeated = Array.from({ length: 6 }, (_, i) => ({
      user: 'same-user',
      value: (i === 5 ? 'green' : 'red') as CrowdLevel,
      reportedAt: new Date(NOW.getTime() - (6 - i) * 60_000),
    }));
    const v = computeVerdict(repeated, opts);
    assert.equal(v.total, 1);
    assert.equal(v.state, 'unverified');
    assert.deepEqual(v.distribution, { green: 1, yellow: 0, red: 0 });
  });

  it('CASE 5: reports older than the window are excluded', () => {
    const old = votes({ red: 5 }, 11); // 11 minutes ago, window is 10
    const fresh = votes({ green: 2 }, 2).map((v) => ({ ...v, user: `fresh-${v.user}` }));
    const v = computeVerdict([...old, ...fresh], opts);
    assert.equal(v.total, 2);
    assert.equal(v.state, 'unverified');
    assert.equal(v.distribution.red, 0);
  });

  it('CASE 6: 5 users but no strict majority (G2 Y2 R1) -> mixed', () => {
    const v = computeVerdict(votes({ green: 2, yellow: 2, red: 1 }), opts);
    assert.equal(v.state, 'mixed');
  });

  it('no reports -> none', () => {
    assert.equal(computeVerdict([], opts).state, 'none');
  });
});
