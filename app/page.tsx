import { headers } from 'next/headers';
import { AutoRefresh } from '@/components/AutoRefresh';
import { ComponentTable } from '@/components/ComponentTable';
import { Gauge } from '@/components/Gauge';
import { Sparkline } from '@/components/Sparkline';
import type { SentimentResponse } from '@/types/sentiment';

export const revalidate = 0;

async function fetchSentiment(): Promise<{ data: SentimentResponse; isDemo: boolean }> {
  const host = headers().get('host') ?? 'localhost:3000';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const endpoint = `${protocol}://${host}/api/sentiment`;

  try {
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as SentimentResponse;
    const isDemo = (data.notes ?? []).some((note) => note.toLowerCase().includes('demo'));
    return { data, isDemo };
  } catch (error) {
    const demo = (await import('@/public/sentiment-sample.json').then((mod) => mod.default).catch(() => null)) as
      | SentimentResponse
      | null;
    if (demo) {
      return { data: { ...demo, notes: [...(demo.notes ?? []), 'served demo data (frontend fallback)'] }, isDemo: true };
    }
    throw error;
  }
}

export default async function Page() {
  const { data, isDemo } = await fetchSentiment();

  const lastUpdated = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(data.as_of));

  return (
    <main>
      <AutoRefresh />
      <header>
        <h1>Market Sentiment Composite</h1>
        <p style={{ color: '#94a3b8', marginTop: '0.75rem', lineHeight: 1.6 }}>
          Aggregated stock-market sentiment synthesized from Alternative.me, Alpha Vantage news analytics, and the CBOE VIX
          volatility index.
        </p>
      </header>

      <section className="gauge-container">
        <Gauge value={data.composite} />
        <div>
          <h2 style={{ marginTop: 0 }}>Latest composite</h2>
          <p style={{ color: '#cbd5f5', fontSize: '1rem', lineHeight: 1.6 }}>
            As of <strong>{lastUpdated}</strong> (UTC), the blended sentiment score is{' '}
            <strong>{data.composite}</strong> out of 100.
          </p>
          <Sparkline composite={data.composite} asOf={data.as_of} isDemo={isDemo} />
          <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '1rem' }}>
            Cache TTL: {data.ttl_seconds} seconds · Model version: {data.model_version}
          </p>
          {isDemo && <div className="banner-demo">Demo data (backend unreachable)</div>}
        </div>
      </section>

      <section>
        <h2 style={{ marginBottom: '1rem' }}>Sources</h2>
        <ComponentTable components={data.components} />
      </section>

      <section className="methodology">
        <details>
          <summary className="details-summary">
            <span>Methodology</span>
          </summary>
          <div style={{ marginTop: '1rem', color: '#cbd5f5', lineHeight: 1.6 }}>
            <p>
              The composite sentiment score is a weighted average of normalized source signals. Each source is mapped to a 0–100
              scale and the weights are renormalized when a source is unavailable. Default weights are Alternative.me (0.35),
              Alpha Vantage news (0.35), and VIX (0.30).
            </p>
            <p>
              Alternative.me’s Fear &amp; Greed index is used directly. Alpha Vantage news sentiment averages the{' '}
              <code>overall_sentiment_score</code> field across the latest finance-related headlines. The CBOE VIX close value is
              mapped to the 0–100 range using a soft curve where sub-12 volatility is bullish and above 35 is fearful.
            </p>
            <p>
              Requests include per-source timeouts, retries, and a 5-minute cache. Vercel CDN cache headers mirror the TTL with
              <code>s-maxage=300</code> and <code>stale-while-revalidate=60</code>.
            </p>
          </div>
        </details>
      </section>

      {data.notes && data.notes.length > 0 && (
        <section className="notes">
          <h3>Notes</h3>
          <ul>
            {data.notes.map((note, index) => (
              <li key={index}>{note}</li>
            ))}
          </ul>
        </section>
      )}

      <footer className="footer">
        Respect upstream data providers&apos; terms of service. This dashboard is intended for informational purposes only.
      </footer>
    </main>
  );
}
