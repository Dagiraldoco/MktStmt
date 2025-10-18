import { fetchSource as fetchAltfg } from './altfg';
import { fetchSource as fetchAlpha } from './alphavantage';
import { fetchSource as fetchVix } from './vix';

export type SourceResult = {
  name: string;
  ok: boolean;
  raw: unknown;
  normalized: number;
  message?: string;
};

export type SourceFetcher = (signal: AbortSignal) => Promise<SourceResult>;

const REGISTRY: Record<string, SourceFetcher> = {
  altfg: fetchAltfg,
  alphavantage: fetchAlpha,
  vix: fetchVix
};

export function listEnabledSources(envValue: string | undefined): Array<[string, SourceFetcher]> {
  if (!envValue) {
    return Object.entries(REGISTRY);
  }
  const keys = envValue
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
  const selected: Array<[string, SourceFetcher]> = [];
  for (const key of keys) {
    const fetcher = REGISTRY[key];
    if (fetcher) {
      selected.push([key, fetcher]);
    }
  }
  return selected.length > 0 ? selected : Object.entries(REGISTRY);
}
