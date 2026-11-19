import { addDays } from './date';
import type { SeventyFiveHardDayLog, SeventyFiveHardState } from '../types';

export const GALLON_OZ = 128;
export const WATER_OZ_STEP = 16;
/** 250 ml is about 8.5 oz; the counter stores whole ounces. */
export const WATER_ML_STEP_OZ = 8;
export const HARD_DAYS = 75;

export const HARD_RULES = ['rule1', 'rule2', 'rule3', 'rule4', 'rule5'] as const;
export type HardRuleId = (typeof HARD_RULES)[number];

export const HARD_RULE_LABELS: Record<HardRuleId, string> = {
  rule1: 'Follow a diet. No cheat meals. No alcohol.',
  rule2: '2 × 45 minute workouts. One must be outside.',
  rule3: 'Drink 1 gallon of water.',
  rule4: 'Read 10 pages (nonfiction).',
  rule5: 'Take a progress picture.',
};

export function emptyHardLog(): SeventyFiveHardDayLog {
  return {
    rule1Diet: false,
    rule2Workout1: false,
    rule2Workout2Outdoor: false,
    rule3WaterGallon: false,
    waterOzLogged: 0,
    rule4Read10Pages: false,
    bookNote: '',
    rule5ProgressPic: false,
  };
}

export function emptySeventyFive(): SeventyFiveHardState {
  return { isActive: false, startDate: null, mode: 'hardcore', photosBlurred: false, dailyLogs: {} };
}

export function ruleFlags(log: SeventyFiveHardDayLog): Record<HardRuleId, boolean> {
  return {
    rule1: log.rule1Diet,
    rule2: log.rule2Workout1 && log.rule2Workout2Outdoor,
    rule3: log.rule3WaterGallon,
    rule4: log.rule4Read10Pages,
    rule5: log.rule5ProgressPic,
  };
}

export function rulesDone(log?: SeventyFiveHardDayLog): number {
  if (!log) return 0;
  return HARD_RULES.filter((rule) => ruleFlags(log)[rule]).length;
}

export function dayComplete(log?: SeventyFiveHardDayLog): boolean {
  return rulesDone(log) === HARD_RULES.length;
}

export function daysBetween(start: string, end: string): number {
  const [ys, ms, ds] = start.split('-').map(Number);
  const [ye, me, de] = end.split('-').map(Number);
  const utc = Date.UTC;
  return Math.round((utc(ye, me - 1, de) - utc(ys, ms - 1, ds)) / 86400000);
}

/** 1 on the start date, clamped to 1…75. */
export function challengeDayNumber(startDate: string | null, today: string): number {
  if (!startDate) return 1;
  return Math.min(HARD_DAYS, Math.max(1, daysBetween(startDate, today) + 1));
}

/** Today can be edited only while it falls inside the 75-day window. */
export function canEditHardDay(state: SeventyFiveHardState, today: string): boolean {
  if (!state.isActive || !state.startDate) return false;
  const elapsed = daysBetween(state.startDate, today);
  return elapsed >= 0 && elapsed < HARD_DAYS;
}

/**
 * In hardcore mode, the first missed day before today. Soft mode never asks for a reset.
 * Returns the date key of that day.
 */
export function missedChallengeDate(state: SeventyFiveHardState, today: string): string | null {
  if (!state.isActive || state.mode !== 'hardcore' || !state.startDate) return null;
  const elapsed = daysBetween(state.startDate, today);
  if (elapsed <= 0) return null;
  const last = Math.min(elapsed, HARD_DAYS);
  for (let i = 0; i < last; i++) {
    const date = addDays(state.startDate, i);
    if (date >= today) break;
    if (!dayComplete(state.dailyLogs[date])) return date;
  }
  return null;
}

export function completedDayCount(state: SeventyFiveHardState, today: string): number {
  if (!state.startDate) return 0;
  let count = 0;
  for (let i = 0; i < HARD_DAYS; i++) {
    const date = addDays(state.startDate, i);
    if (date > today) break;
    if (dayComplete(state.dailyLogs[date])) count++;
  }
  return count;
}

export type TileTone = 'future' | 'today' | 'done' | 'missed';

export function tileTone(startDate: string, day: number, today: string, logs: SeventyFiveHardState['dailyLogs']): TileTone {
  const date = addDays(startDate, day - 1);
  if (date > today) return 'future';
  if (dayComplete(logs[date])) return 'done';
  if (date === today) return 'today';
  return 'missed';
}

/** A log with no synced fields can stay on the device when it only holds a photo. */
export function hasServerFields(log: SeventyFiveHardDayLog): boolean {
  return (
    log.rule1Diet ||
    log.rule2Workout1 ||
    log.rule2Workout2Outdoor ||
    log.rule3WaterGallon ||
    log.waterOzLogged > 0 ||
    log.rule4Read10Pages ||
    log.bookNote.trim().length > 0 ||
    log.rule5ProgressPic ||
    !!log.completedAt
  );
}

export function isHardLogEmpty(log: SeventyFiveHardDayLog): boolean {
  return !hasServerFields(log) && !log.photoUri;
}

/** Keep on-device photo URIs when the server copy of a day is applied. */
export function mergeDevicePhotos(
  logs: Record<string, SeventyFiveHardDayLog>,
  localLogs: Record<string, SeventyFiveHardDayLog> | undefined,
): Record<string, SeventyFiveHardDayLog> {
  const out: Record<string, SeventyFiveHardDayLog> = { ...logs };
  for (const [date, local] of Object.entries(localLogs ?? {})) {
    if (!local.photoUri) continue;
    out[date] = { ...(out[date] ?? emptyHardLog()), photoUri: local.photoUri };
  }
  return out;
}
