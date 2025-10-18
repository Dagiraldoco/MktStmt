export type WeightMap = Record<string, number>;

export type VixCurve = {
  low: number;
  lowScore: number;
  neutral: number;
  neutralScore: number;
  high: number;
  highScore: number;
  floorScore: number;
  ceilingScore: number;
};

export const DEFAULT_VIX_CURVE: VixCurve = {
  low: 12,
  lowScore: 80,
  neutral: 20,
  neutralScore: 50,
  high: 35,
  highScore: 20,
  floorScore: 5,
  ceilingScore: 95
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function normalizeFearGreed(indexValue: number): number {
  if (!Number.isFinite(indexValue)) {
    throw new Error('Fear & Greed value must be numeric');
  }
  return clamp(Math.round(indexValue), 0, 100);
}

export function normalizeAlphaVantageSentiment(avgSentiment: number): number {
  if (!Number.isFinite(avgSentiment)) {
    throw new Error('Average sentiment must be numeric');
  }
  const scaled = Math.round(clamp((avgSentiment + 1) * 50, 0, 100));
  return scaled;
}

function interpolate(
  value: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  if (x1 === x2) {
    return y1;
  }
  const ratio = (value - x1) / (x2 - x1);
  return y1 + ratio * (y2 - y1);
}

export function normalizeVix(value: number, curve: VixCurve = DEFAULT_VIX_CURVE): number {
  if (!Number.isFinite(value)) {
    throw new Error('VIX value must be numeric');
  }

  if (value <= curve.low) {
    const extrapolated = interpolate(value, 0, curve.ceilingScore, curve.low, curve.lowScore);
    return Math.round(clamp(extrapolated, curve.floorScore, curve.ceilingScore));
  }

  if (value <= curve.neutral) {
    const interp = interpolate(value, curve.low, curve.lowScore, curve.neutral, curve.neutralScore);
    return Math.round(clamp(interp, curve.floorScore, curve.ceilingScore));
  }

  if (value <= curve.high) {
    const interp = interpolate(value, curve.neutral, curve.neutralScore, curve.high, curve.highScore);
    return Math.round(clamp(interp, curve.floorScore, curve.ceilingScore));
  }

  const extrapolated = interpolate(
    Math.min(value, curve.high + 40),
    curve.high,
    curve.highScore,
    curve.high + 40,
    curve.floorScore
  );
  return Math.round(clamp(extrapolated, curve.floorScore, curve.ceilingScore));
}

export type WeightApplication = {
  appliedWeights: Record<string, number>;
  totalWeight: number;
};

export function applyWeights(
  weightMap: WeightMap,
  successes: string[]
): WeightApplication {
  const total = successes.reduce((sum, key) => sum + (weightMap[key] ?? 0), 0);
  if (total <= 0) {
    return { appliedWeights: Object.fromEntries(successes.map((k) => [k, 1 / successes.length])), totalWeight: 1 };
  }
  const applied: Record<string, number> = {};
  for (const key of successes) {
    const weight = weightMap[key] ?? 0;
    applied[key] = weight / total;
  }
  return { appliedWeights: applied, totalWeight: 1 };
}

export function computeComposite(
  normalized: Array<{ name: string; normalized: number; ok: boolean }>,
  weightMap: WeightMap
): { composite: number; appliedWeights: Record<string, number> } {
  const successes = normalized.filter((item) => item.ok);
  if (successes.length === 0) {
    return { composite: 0, appliedWeights: {} };
  }
  const { appliedWeights } = applyWeights(
    weightMap,
    successes.map((item) => item.name)
  );

  let score = 0;
  for (const item of successes) {
    const weight = appliedWeights[item.name] ?? 0;
    score += weight * item.normalized;
  }
  return { composite: Math.round(score), appliedWeights };
}
