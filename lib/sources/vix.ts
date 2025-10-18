import { z } from 'zod';
import { normalizeVix } from '../normalize';
import type { SourceResult } from './index';

const StooqSchema = z.object({
  symbols: z
    .array(
      z.object({
        close: z.string().transform((val) => Number.parseFloat(val)),
        symbol: z.string()
      })
    )
    .min(1)
});

const URL = 'https://stooq.com/q/l/?s=^vix&f=sd2t2ohlcv&h&e=json';

export async function fetchSource(signal: AbortSignal): Promise<SourceResult> {
  try {
    const response = await fetch(URL, { signal });
    if (!response.ok) {
      return {
        name: 'vix',
        ok: false,
        raw: { status: response.status },
        normalized: 0,
        message: `HTTP ${response.status}`
      };
    }

    const json = await response.json();
    const parsed = StooqSchema.safeParse(json);
    if (!parsed.success) {
      return {
        name: 'vix',
        ok: false,
        raw: json,
        normalized: 0,
        message: 'Unexpected response structure'
      };
    }

    const data = parsed.data.symbols[0];
    const vixValue = data.close;
    if (!Number.isFinite(vixValue)) {
      return {
        name: 'vix',
        ok: false,
        raw: data,
        normalized: 0,
        message: 'Invalid VIX close value'
      };
    }

    const normalized = normalizeVix(vixValue);
    return {
      name: 'vix',
      ok: true,
      raw: data,
      normalized,
      message: `close=${vixValue.toFixed(2)}`
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'vix',
      ok: false,
      raw: null,
      normalized: 0,
      message
    };
  }
}
