import { z } from 'zod';
import { normalizeAlphaVantageSentiment } from '../normalize';
import type { SourceResult } from './index';

const NewsSchema = z.object({
  items: z.string().transform((val) => Number.parseInt(val, 10)).optional(),
  feed: z
    .array(
      z.object({
        overall_sentiment_score: z.number().or(z.string().transform((val) => Number.parseFloat(val))).optional()
      })
    )
    .optional()
});

const BASE_URL = 'https://www.alphavantage.co/query?function=NEWS_SENTIMENT&sort=LATEST&topics=finance';

function averageSentiment(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

export async function fetchSource(signal: AbortSignal): Promise<SourceResult> {
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    return {
      name: 'alphavantage',
      ok: false,
      raw: null,
      normalized: 0,
      message: 'Missing ALPHAVANTAGE_API_KEY'
    };
  }

  const url = `${BASE_URL}&apikey=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      return {
        name: 'alphavantage',
        ok: false,
        raw: { status: response.status },
        normalized: 0,
        message: `HTTP ${response.status}`
      };
    }

    const json = await response.json();
    const parsed = NewsSchema.safeParse(json);
    if (!parsed.success) {
      return {
        name: 'alphavantage',
        ok: false,
        raw: json,
        normalized: 0,
        message: 'Unexpected response structure'
      };
    }

    const sentiments = (parsed.data.feed ?? [])
      .map((item) => (typeof item.overall_sentiment_score === 'number' ? item.overall_sentiment_score : undefined))
      .filter((val): val is number => typeof val === 'number' && Number.isFinite(val));

    const avg = averageSentiment(sentiments ?? []);
    if (avg === undefined) {
      return {
        name: 'alphavantage',
        ok: false,
        raw: parsed.data,
        normalized: 0,
        message: 'No sentiment data available'
      };
    }

    const normalized = normalizeAlphaVantageSentiment(avg);
    return {
      name: 'alphavantage',
      ok: true,
      raw: { items: parsed.data.items, avgSentiment: avg },
      normalized,
      message: `avgSent=${avg.toFixed(3)}`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'alphavantage',
      ok: false,
      raw: null,
      normalized: 0,
      message
    };
  }
}
