import { energyMeta } from '../theme';
import type { CategoryId, EnergyMode, Task, Weekday, WinEvent } from '../types';
import { addDays, lastSevenDays } from './date';

export const DEFAULT_MODE: EnergyMode = 'balanced';

export function isTaskScheduled(task: Task, weekday: Weekday): boolean {
  return task.days.includes(weekday);
}

export function isTaskVisibleInMode(task: Pick<Task, 'tier'>, mode: EnergyMode): boolean {
  if (mode === 'high') return true;
  if (mode === 'balanced') return task.tier <= 2;
  return task.tier === 1;
}

export function winsOn(events: WinEvent[], date: string): number {
  let total = 0;
  for (const e of events) if (e.date === date) total += e.amount;
  return total;
}

export function winsByDate(events: WinEvent[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of events) out[e.date] = (out[e.date] ?? 0) + e.amount;
  return out;
}

export function modeOn(dayModes: Record<string, EnergyMode>, date: string): EnergyMode {
  return dayModes[date] ?? DEFAULT_MODE;
}

export function targetOn(dayModes: Record<string, EnergyMode>, date: string): number {
  return energyMeta[modeOn(dayModes, date)].target;
}

/**
 * A day "counts" when it reaches the target of the Energy Mode chosen for it, which is how Soft Days
 * protect the streak. Today extends the streak once met but never breaks it while still in progress.
 */
export function computeStreak(events: WinEvent[], dayModes: Record<string, EnergyMode>, today: string): number {
  const byDate = winsByDate(events);
  const met = (d: string) => (byDate[d] ?? 0) >= targetOn(dayModes, d);
  let streak = met(today) ? 1 : 0;
  let cursor = addDays(today, -1);
  for (let i = 0; i < 3650 && met(cursor); i++) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function bestStreak(events: WinEvent[], dayModes: Record<string, EnergyMode>, today: string): number {
  const byDate = winsByDate(events);
  const dates = Object.keys(byDate).sort();
  if (!dates.length) return 0;
  let best = 0;
  let run = 0;
  for (let d = dates[0]; d <= today; d = addDays(d, 1)) {
    if ((byDate[d] ?? 0) >= targetOn(dayModes, d)) {
      run++;
      best = Math.max(best, run);
    } else if (d !== today) {
      run = 0;
    }
  }
  return best;
}

export function isDone(events: WinEvent[], date: string, source: WinEvent['source'], refId: string): boolean {
  return events.some((e) => e.date === date && e.source === source && e.refId === refId);
}

export function categoryTotals(events: WinEvent[], dates: string[]): Record<CategoryId, number> {
  const set = new Set(dates);
  const totals: Record<CategoryId, number> = { morning: 0, studies: 0, movement: 0, selfcare: 0, home: 0 };
  for (const e of events) if (set.has(e.date)) totals[e.category] += e.amount;
  return totals;
}

export function weekWins(events: WinEvent[], today: string): number {
  const set = new Set(lastSevenDays(today));
  let total = 0;
  for (const e of events) if (set.has(e.date)) total += e.amount;
  return total;
}
