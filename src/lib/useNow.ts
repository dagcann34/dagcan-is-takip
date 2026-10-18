import { useEffect, useState } from 'react';

/** Belirli aralıkla yenilenen "şimdi" değeri. intervalMs = 0 ise sayaç çalışmaz. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!intervalMs) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
