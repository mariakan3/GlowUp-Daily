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
  /** Wins awarded on completion; defaults to 1. */
  wins?: number;
  /** Rough effort estimate, used by the Quick Win roulette (≤ 2 = instant). */
  minutes?: number;
  /** Set on tasks the AI Concierge created or rewrote; shown as a hint under the title. */
  remixNote?: string;
  splitFrom?: string;
  step?: number;
}

export type RoutineId = 'am' | 'pm';

export interface RoutineStep {
  id: string;
  routine: RoutineId;
  title: string;
  emoji: string;
  order: number;
}

export type WinSource = 'task' | 'routine' | 'focus' | 'movement' | 'milestone' | 'roulette' | 'bonus' | 'hard75';

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
  sport?: SportId;
  minutes?: number;
}

export interface GoalInput {
  title: string;
  emoji: string;
  category: CategoryId;
  milestones: string[];
}

export type DayPresetId = 'exam' | 'thatgirl' | 'cozy' | 'busy';
export type BatteryLevel = 'low' | 'medium' | 'unstoppable';
export type MovementPick = 'tennis' | 'pilates' | 'gym' | 'run' | 'rest';
export type HomeTime = 10 | 30 | 60;
export type AIProvider = 'off' | 'openai' | 'gemini';
export type PlannerEngine = 'rules' | 'openai' | 'gemini';

export interface RemixInput {
  presetId: DayPresetId | null;
  battery: BatteryLevel;
  movement: MovementPick;
  homeTime: HomeTime;
  prompt: string;
}

export interface RemixResult {
  tasks: Task[];
  energyMode: EnergyMode;
  summary: string;
  changes: string[];
  engine: PlannerEngine;
  fallbackReason?: string;
}

export interface AIScheduleProfile extends RemixInput {
  date: string;
  appliedAt: number;
  engine: PlannerEngine;
  summary: string;
  changes: string[];
  fallbackReason?: string;
}

/** Today's active checklist when it differs from the weekday templates (after a remix or split). */
export interface DayPlan {
  date: string;
  tasks: Task[];
}

export interface TasksSnapshot {
  date: string;
  plan: Task[] | null;
  mode: EnergyMode;
  profile: AIScheduleProfile | null;
}

export interface AISettings {
  provider: AIProvider;
  model: string;
  hasKey: boolean;
}

export type SeventyFiveHardMode = 'hardcore' | 'soft';

/** One challenge day. `photoUri` is a local file or blob URI and is never sent to the server. */
export interface SeventyFiveHardDayLog {
  rule1Diet: boolean;
  rule2Workout1: boolean;
  rule2Workout2Outdoor: boolean;
  rule3WaterGallon: boolean;
  /** Ounces toward 128 (one gallon). */
  waterOzLogged: number;
  rule4Read10Pages: boolean;
  bookNote: string;
  rule5ProgressPic: boolean;
  photoUri?: string;
  completedAt?: string;
}

export interface SeventyFiveHardState {
  isActive: boolean;
  /** YYYY-MM-DD the current attempt started. Day 1 is this date. */
  startDate: string | null;
  /** Hardcore is the official challenge. Soft keeps completed days when a day is missed. */
  mode: SeventyFiveHardMode;
  photosBlurred: boolean;
  dailyLogs: Record<string, SeventyFiveHardDayLog>;
}
