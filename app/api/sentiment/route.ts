import { NextResponse } from 'next/server';
import { sentimentCache } from '@/lib/cache';
import { computeComposite, type WeightMap } from '@/lib/normalize';
import { listEnabledSources, type SourceResult } from '@/lib/sources';
import type { SentimentResponse } from '@/types/sentiment';

const MODEL_VERSION = 'v1.0.0';
const CACHE_KEY = 'sentiment';
const DEFAULT_TTL_SECONDS = 300;
const STALE_SECONDS = 60;
const SOURCE_TIMEOUT_MS = 3500;
const RETRY_DELAY_MS = 600;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseWeights(envValue: string | undefined): WeightMap {
  if (!envValue) {
    return {
      altfg: 0.35,
      alphavantage: 0.35,
      vix: 0.3
    };
  }
  try {
    const parsed = JSON.parse(envValue) as WeightMap;
    return parsed;
  } catch (error) {
    console.warn('Failed to parse DEFAULT_WEIGHTS_JSON', error);
    return {
      altfg: 0.35,
      alphavantage: 0.35,
      vix: 0.3
    };
  }
}

async function fetchWithTimeout(fetcher: (signal: AbortSignal) => Promise<SourceResult>): Promise<SourceResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOURCE_TIMEOUT_MS);
  try {
    return await fetcher(controller.signal);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'unknown',
      ok: false,
      normalized: 0,
      raw: null,
      message
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(fetcher: (signal: AbortSignal) => Promise<SourceResult>): Promise<SourceResult> {
  const first = await fetchWithTimeout(fetcher);
  if (first.ok || first.message === 'Missing ALPHAVANTAGE_API_KEY') {
    return first;
  }
  await sleep(RETRY_DELAY_MS);
  return await fetchWithTimeout(fetcher);
}

function buildDetails(raw: unknown): Record<string, unknown> | undefined {
  if (raw === null || typeof raw !== 'object') return undefined;
  const allowedKeys = ['index', 'avgSentiment', 'close', 'value', 'value_classification', 'items'];
  const result: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(raw as Record<string, unknown>, key)) {
      result[key] = (raw as Record<string, unknown>)[key];
    }
  }
  return Object.keys(result).length ? result : undefined;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cached = sentimentCache.get(CACHE_KEY) as SentimentResponse | undefined;
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'Cache-Control': `s-maxage=${cached.ttl_seconds}, stale-while-revalidate=${STALE_SECONDS}`
      }
    });
  }

  const url = new URL(request.url);
  const weightsEnv = parseWeights(process.env.DEFAULT_WEIGHTS_JSON);
  const enabledSources = listEnabledSources(process.env.ENABLED_SOURCES);
  const isProduction = process.env.NODE_ENV === 'production';

  let weightOverrides: WeightMap | undefined;
  if (!isProduction && url.searchParams.has('weights')) {
    try {
      weightOverrides = JSON.parse(url.searchParams.get('weights') ?? '{}');
    } catch (error) {
      console.warn('Failed to parse weights override', error);
    }
  }

  const weightMap = { ...weightsEnv, ...(weightOverrides ?? {}) } satisfies WeightMap;

  const maxAgeOverride = !isProduction ? Number(url.searchParams.get('maxAge') ?? '0') : 0;
  const ttlSeconds = Number.isFinite(maxAgeOverride) && maxAgeOverride > 0 ? maxAgeOverride : DEFAULT_TTL_SECONDS;

  const results: SourceResult[] = await Promise.all(
    enabledSources.map(async ([name, fetcher]) => {
      const result = await fetchWithRetry(fetcher);
      return result.name === 'unknown' ? { ...result, name } : result;
    })
  );

  const composites = computeComposite(
    results.map((r) => ({ name: r.name, normalized: r.normalized, ok: r.ok })),
    weightMap
  );

  const components = results.map((result) => ({
    name: result.name,
    ok: result.ok,
    normalized: result.normalized,
    weight_applied: result.ok ? composites.appliedWeights[result.name] ?? 0 : 0,
    details: buildDetails(result.raw),
    message: result.message
  }));

  const okCount = results.filter((r) => r.ok).length;
  const notes: string[] = [];

  if (okCount === 0) {
    const demo = await import('@/public/sentiment-sample.json')
      .then((mod) => mod.default as SentimentResponse)
      .catch(() => undefined);
    if (demo) {
      demo.notes = [...(demo.notes ?? []), 'served demo data'];
      sentimentCache.set(CACHE_KEY, demo, ttlSeconds * 1000);
      return NextResponse.json(demo, {
        headers: {
          'Cache-Control': `s-maxage=${ttlSeconds}, stale-while-revalidate=${STALE_SECONDS}`
        }
      });
    }
    notes.push('All sources failed and no demo payload available');
  } else {
    for (const result of results) {
      if (result.ok && result.message) {
        notes.push(`${result.name} ${result.message}`);
      } else if (!result.ok && result.message) {
        notes.push(`${result.name} unavailable (${result.message})`);
      }
    }
  }

  const response: SentimentResponse = {
    as_of: new Date().toISOString(),
    composite: composites.composite,
    model_version: MODEL_VERSION,
    ttl_seconds: ttlSeconds,
    components,
    notes: notes.length > 0 ? notes : undefined
  };

  sentimentCache.set(CACHE_KEY, response, ttlSeconds * 1000);

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': `s-maxage=${ttlSeconds}, stale-while-revalidate=${STALE_SECONDS}`
    }
  });
}
