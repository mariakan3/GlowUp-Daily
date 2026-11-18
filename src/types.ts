export type CategoryId = 'morning' | 'studies' | 'movement' | 'selfcare' | 'home';

export type TimeOfDay = 'morning' | 'daytime' | 'evening';

export type EnergyMode = 'high' | 'balanced' | 'soft';

/** 1 = essential (shown in every mode), 2 = standard (Balanced + High), 3 = High Era only. */
export type TaskTier = 1 | 2 | 3;

export type SportId = 'pilates' | 'tennis' | 'running' | 'gym' | 'walk';

/** 0 = Sunday … 6 = Saturday, matching Date#getDay. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Task {
  id: string;
  title: string;
  emoji: string;
  category: CategoryId;
  timeOfDay: TimeOfDay;
  tier: TaskTier;
  days: Weekday[];
  order: number;
  sport?: SportId;
  custom: boolean;
}

export type RoutineId = 'am' | 'pm';

export interface RoutineStep {
  id: string;
  routine: RoutineId;
  title: string;
  emoji: string;
  order: number;
}

export type WinSource = 'task' | 'routine' | 'focus' | 'movement' | 'milestone';

export interface WinEvent {
  id: string;
  date: string;
  ts: number;
  source: WinSource;
  refId: string;
  amount: number;
  category: CategoryId;
  label: string;
}

export interface FocusPreset {
  id: string;
  name: string;
  focusMin: number;
  breakMin: number;
  emoji: string;
}

export interface FocusSession {
  id: string;
  date: string;
  ts: number;
  subject: string;
  minutes: number;
  presetId: string;
}

export type TimerPhase = 'idle' | 'focus' | 'break';

export interface TimerState {
  phase: TimerPhase;
  presetId: string;
  subject: string;
  /** Epoch ms when the running phase ends; null when paused or idle. */
  endsAt: number | null;
  /** Seconds left when paused. */
  pausedRemaining: number | null;
  phaseDurationSec: number;
}

export type MovementVibe = '🔥' | '🧘‍♀️' | '⚡' | '🎾';

export interface MovementSession {
  id: string;
  date: string;
  ts: number;
  sport: SportId;
  minutes: number;
  vibe: MovementVibe;
  note: string;
  winEventId: string;
}

export interface Milestone {
  id: string;
  title: string;
  doneAt: number | null;
}

export interface Goal {
  id: string;
  title: string;
  emoji: string;
  category: CategoryId;
  milestones: Milestone[];
  createdAt: number;
}

export type ToastKind = 'win' | 'super' | 'focus' | 'info';

export interface Toast {
  id: string;
  text: string;
  kind: ToastKind;
}

export interface TaskInput {
  title: string;
  emoji: string;
  category: CategoryId;
  timeOfDay: TimeOfDay;
  tier: TaskTier;
  days: Weekday[];
}

export interface GoalInput {
  title: string;
  emoji: string;
  category: CategoryId;
  milestones: string[];
}
