import { z } from 'zod';
import { normalizeFearGreed } from '../normalize';
import type { SourceResult } from './index';

const AltfgSchema = z.object({
  data: z
    .array(
      z.object({
        value: z.string(),
        value_classification: z.string().optional()
      })
    )
    .nonempty()
});

const ALT_URL = 'https://api.alternative.me/fng/?limit=1&format=json';

export async function fetchSource(signal: AbortSignal): Promise<SourceResult> {
  try {
    const response = await fetch(ALT_URL, { signal });
    if (!response.ok) {
      return {
        name: 'altfg',
        ok: false,
        raw: { status: response.status },
        normalized: 0,
        message: `HTTP ${response.status}`
      };
    }

    const json = await response.json();
    const parsed = AltfgSchema.safeParse(json);
    if (!parsed.success) {
      return {
        name: 'altfg',
        ok: false,
        raw: json,
        normalized: 0,
        message: 'Unexpected response structure'
      };
    }

    const latest = parsed.data.data[0];
    const value = Number.parseFloat(latest.value);
    const normalized = normalizeFearGreed(value);
    return {
      name: 'altfg',
      ok: true,
      raw: latest,
      normalized,
      message: latest.value_classification
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      name: 'altfg',
      ok: false,
      raw: null,
      normalized: 0,
      message
    };
  }
}
