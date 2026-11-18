import { useEffect, useMemo, useState } from 'react';
import { useGlowStore } from '../store/useGlowStore';
import { energyMeta } from '../theme';
import { todayKey } from './date';
import { computeStreak, modeOn, winsOn } from './wins';

/** Today's date key, refreshed each minute so the app rolls over at midnight without a reload. */
export function useToday(): string {
  const [key, setKey] = useState(todayKey);
  useEffect(() => {
    const id = setInterval(() => {
      const next = todayKey();
      setKey((prev) => (prev === next ? prev : next));
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return key;
}

export function useTodayStats() {
  const today = useToday();
  const events = useGlowStore((s) => s.events);
  const dayModes = useGlowStore((s) => s.dayModes);
  return useMemo(() => {
    const mode = modeOn(dayModes, today);
    const target = energyMeta[mode].target;
    const wins = winsOn(events, today);
    const streak = computeStreak(events, dayModes, today);
    return { today, mode, target, wins, streak };
  }, [events, dayModes, today]);
}

/** Ticks at the given interval while `active`, returning Date.now(). */
export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
  return now;
}
