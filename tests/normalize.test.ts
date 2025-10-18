import { describe, expect, it } from 'vitest';
import {
  DEFAULT_VIX_CURVE,
  computeComposite,
  normalizeAlphaVantageSentiment,
  normalizeFearGreed,
  normalizeVix
} from '@/lib/normalize';

describe('normalizeFearGreed', () => {
  it('clamps to 0-100 range', () => {
    expect(normalizeFearGreed(110)).toBe(100);
    expect(normalizeFearGreed(-5)).toBe(0);
    expect(normalizeFearGreed(55)).toBe(55);
  });
});

describe('normalizeAlphaVantageSentiment', () => {
  it('maps [-1,1] to [0,100]', () => {
    expect(normalizeAlphaVantageSentiment(-1)).toBe(0);
    expect(normalizeAlphaVantageSentiment(0)).toBe(50);
    expect(normalizeAlphaVantageSentiment(1)).toBe(100);
  });
});

describe('normalizeVix', () => {
  it('awards higher scores to lower volatility', () => {
    const bullish = normalizeVix(12, DEFAULT_VIX_CURVE);
    const neutral = normalizeVix(20, DEFAULT_VIX_CURVE);
    const fearful = normalizeVix(35, DEFAULT_VIX_CURVE);
    expect(bullish).toBeGreaterThan(neutral);
    expect(neutral).toBeGreaterThan(fearful);
  });
});

describe('computeComposite', () => {
  it('renormalizes weights when sources fail', () => {
    const weights = { a: 0.5, b: 0.3, c: 0.2 };
    const result = computeComposite(
      [
        { name: 'a', normalized: 80, ok: true },
        { name: 'b', normalized: 60, ok: false },
        { name: 'c', normalized: 40, ok: true }
      ],
      weights
    );

    expect(result.appliedWeights).toEqual({ a: 0.7142857142857143, c: 0.2857142857142857 });
    expect(result.composite).toBe(Math.round(0.7142857142857143 * 80 + 0.2857142857142857 * 40));
  });
});
