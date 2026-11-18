import type { DayPlan, EnergyMode, RoutineStep, Task, WinEvent } from '../types';
import { weekdayOf } from './date';
import { isTaskScheduled } from './wins';

const byOrder = (a: Task, b: Task) => a.order - b.order;

/** Today's checklist: the remixed/split plan when one exists for `date`, else the weekday templates. */
export function activeTasksFor(tasks: Task[], dayPlan: DayPlan | null, date: string): Task[] {
  if (dayPlan?.date === date) return [...dayPlan.tasks].sort(byOrder);
  const wd = weekdayOf(date);
  return tasks.filter((t) => isTaskScheduled(t, wd)).sort(byOrder);
}

export function doneTaskIds(events: WinEvent[], date: string): Set<string> {
  return new Set(events.filter((e) => e.date === date && e.source === 'task').map((e) => e.refId));
}

/** Shelf wins visible on Today in a given mode (the PM shelf is tucked away on Soft Days). */
export function shelfWinsFor(steps: RoutineStep[], mode: EnergyMode): number {
  return steps.filter((s) => s.routine === 'am' || mode !== 'soft').length;
}
