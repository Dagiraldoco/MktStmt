'use client';

import { useEffect, useMemo, useState } from 'react';

type HistoryEntry = {
  value: number;
  timestamp: string;
  demo: boolean;
};

type SparklineProps = {
  composite: number;
  asOf: string;
  isDemo: boolean;
};

const STORAGE_KEY = 'sentiment-history-v1';
const MAX_POINTS = 20;

export function Sparkline({ composite, asOf, isDemo }: SparklineProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: HistoryEntry[] = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (error) {
      console.warn('Unable to read history', error);
    }
  }, []);

  useEffect(() => {
    setHistory((prev) => {
      const existing = prev.filter((entry) => entry.timestamp !== asOf);
      const next = [...existing, { value: composite, timestamp: asOf, demo: isDemo }]
        .slice(-MAX_POINTS)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.warn('Unable to persist history', error);
      }
      return next;
    });
  }, [asOf, composite, isDemo]);

  const path = useMemo(() => {
    if (history.length === 0) return '';
    const values = history.map((item) => item.value);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);
    const normalize = (value: number) => {
      if (max === min) return 50;
      return ((value - min) / (max - min)) * 100;
    };
    return history
      .map((item, index) => {
        const x = (index / Math.max(history.length - 1, 1)) * 100;
        const y = 100 - normalize(item.value);
        return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
      })
      .join(' ');
  }, [history]);

  const latestDemo = history[history.length - 1]?.demo ?? false;

  return (
    <div className="sparkline-wrapper" aria-live="polite">
      <div>
        <strong>History</strong>
        <p style={{ margin: '0.35rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
          Last {history.length} points
        </p>
        {latestDemo && (
          <p style={{ margin: '0.35rem 0 0', color: '#facc15', fontSize: '0.75rem' }}>Includes demo data</p>
        )}
      </div>
      <svg
        className="sparkline"
        width="200"
        height="80"
        viewBox="0 0 100 100"
        role="img"
        aria-label="Composite sentiment history"
      >
        <path d="M 0,100 L 100,100" stroke="rgba(148,163,184,0.2)" strokeWidth={0.5} />
        <path d="M 0,0 L 0,100" stroke="rgba(148,163,184,0.2)" strokeWidth={0.5} />
        <path
          d={path}
          fill="none"
          stroke="url(#sparklineGradient)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="sparklineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
