'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const FIVE_MINUTES = 5 * 60 * 1000;

export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      if (!cancelled) {
        router.refresh();
      }
    };
    const interval = window.setInterval(tick, FIVE_MINUTES);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [router]);

  return null;
}
