# Market Sentiment Composite

A production-ready Next.js 14 + TypeScript dashboard that aggregates stock-market sentiment from multiple upstream sources. The backend fetches Alternative.me’s Fear & Greed index, Alpha Vantage news sentiment, and the CBOE VIX to produce a weighted 0–100 composite that is cached for five minutes. The frontend exposes a transparent, responsive interface suitable for Vercel deployment.

## Getting started

```bash
npm install
cp .env.example .env.local
# populate ALPHAVANTAGE_API_KEY before running dev server
npm run dev
```

### Required environment variables

| Name | Description |
| --- | --- |
| `ALPHAVANTAGE_API_KEY` | Server-side key for Alpha Vantage News Sentiment. Required for that source. |
| `ENABLED_SOURCES` | Comma-separated list of source IDs (`altfg`, `alphavantage`, `vix`). Optional. |
| `DEFAULT_WEIGHTS_JSON` | JSON mapping of source weights. Defaults to `{ "altfg": 0.35, "alphavantage": 0.35, "vix": 0.3 }`. |

Keys are never exposed client-side. The API route reads from `process.env` and runs on a Node.js serverless function when deployed to Vercel.

## Running tests and lint

```bash
npm run lint
npm run test
```

Vitest covers normalization helpers, ensuring the VIX curve and weight renormalization logic behave as expected.

## Deployment notes

- **Framework**: Next.js 14 App Router, TypeScript, CSS modules-free styling via `globals.css`.
- **API route**: `/api/sentiment` is a Node.js Serverless Function on Vercel. Responses are cached in-memory for 300s and emit `Cache-Control: s-maxage=300, stale-while-revalidate=60` headers for Vercel’s CDN.
- **Resilience**: Each source adapter respects per-source timeouts with a retry, never throws, and reports partial failures. If all sources fail, a bundled demo payload is returned so the UI continues functioning.
- **Configuration**: Override source weights in development via `?weights=` query string or adjust cache TTL with `?maxAge=`. Overrides are ignored in production builds.
- **History**: The frontend maintains a 20-point localStorage sparkline for the composite score while the browser session is warm.

## Data-source considerations

Respect the terms of service and rate limits for each provider. Prefer official APIs (Alternative.me, Alpha Vantage, Stooq for VIX close). Scraped endpoints can change without notice, so monitor adapters and update as needed.
