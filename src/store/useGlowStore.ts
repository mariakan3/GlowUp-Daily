import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEFAULT_FOCUS_SUBJECT, focusPresets } from '../data/presets';
import { todayKey, weekdayOf } from '../lib/date';
import { uid } from '../lib/id';
import { activeTasksFor, doneTaskIds, shelfWinsFor } from '../lib/plan';
import { getApiKey } from '../lib/secureKey';
import { isDone, isTaskScheduled, modeOn } from '../lib/wins';
import { DEFAULT_MODELS, planDay, splitIntoMicroWins, type QuickWinCandidate } from '../services/aiPlannerService';
import { sportMeta } from '../theme';
import type {
  AIScheduleProfile,
  AISettings,
  DayPlan,
  EnergyMode,
  RemixInput,
  RemixResult,
  TasksSnapshot,
  FocusSession,
  Goal,
  GoalInput,
  MovementSession,
  MovementVibe,
  RoutineId,
  RoutineStep,
  SportId,
  Task,
  TaskInput,
  TimerState,
  Toast,
  ToastKind,
  Weekday,
  WinEvent,
} from '../types';

export { uid };

const idleTimer: TimerState = {
  phase: 'idle',
  presetId: 'pomodoro',
  subject: '',
  endsAt: null,
  pausedRemaining: null,
  phaseDurationSec: 25 * 60,
};

export interface PersistedState {
  tasks: Task[];
  routineSteps: RoutineStep[];
  events: WinEvent[];
  dayModes: Record<string, EnergyMode>;
  subjects: string[];
  focusSessions: FocusSession[];
  timer: TimerState;
  movementSessions: MovementSession[];
  goals: Goal[];
  userName: string;
  dayPlan: DayPlan | null;
  previousTasksSnapshot: TasksSnapshot | null;
  aiScheduleProfile: AIScheduleProfile | null;
  aiSettings: AISettings;
  onboarded: boolean;
}

export interface GlowState extends PersistedState {
  hydrated: boolean;
  toasts: Toast[];

  pushToast: (text: string, kind?: ToastKind) => void;
  dismissToast: (id: string) => void;

  toggleTask: (taskId: string) => boolean;
  addTask: (input: TaskInput) => void;
  updateTask: (id: string, input: Partial<TaskInput>) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, direction: -1 | 1, scopeIds: string[]) => void;
  toggleTaskDay: (id: string, day: Weekday) => void;

  setEnergyMode: (mode: EnergyMode) => void;

  toggleRoutineStep: (stepId: string) => 'done' | 'undone' | 'locked';
  addRoutineStep: (routine: RoutineId, title: string, emoji: string) => void;
  removeRoutineStep: (stepId: string) => void;

  setTimerPreset: (presetId: string) => void;
  setTimerSubject: (subject: string) => void;
  addSubject: (subject: string) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  finishTimerPhase: () => void;

  logMovement: (input: { sport: SportId; minutes: number; vibe: MovementVibe; note: string }) => void;
  deleteMovement: (id: string) => void;

  addGoal: (input: GoalInput) => void;
  updateGoal: (id: string, input: GoalInput) => void;
  deleteGoal: (id: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => boolean;

  applyAIRemix: (input: RemixInput) => Promise<RemixResult>;
  revertAIRemix: () => void;
  splitTaskIntoMicroWins: (taskId: string) => void;
  completeQuickWin: (candidate: QuickWinCandidate, beatTimer: boolean) => void;
  setAISettings: (patch: Partial<AISettings>) => void;

  setUserName: (name: string) => void;
  completeOnboarding: (input: { name: string; tasks: TaskInput[]; steps: { routine: RoutineId; title: string; emoji: string }[] }) => void;
  /** Replaces all user data, e.g. after pulling from the server or signing out. */
  replaceUserData: (data: PersistedState) => void;
}

export function createEmptyState(): PersistedState {
  return {
    tasks: [],
    routineSteps: [],
    events: [],
    dayModes: {},
    subjects: [],
    focusSessions: [],
    timer: idleTimer,
    movementSessions: [],
    goals: [],
    userName: '',
    dayPlan: null,
    previousTasksSnapshot: null,
    aiScheduleProfile: null,
    aiSettings: { provider: 'off', model: DEFAULT_MODELS.openai, hasKey: false },
    onboarded: false,
  };
}

/**
 * Per-user device cache. Writes are dropped while nobody is signed in, so clearing the store on sign-out
 * never overwrites a user's cache, and one account's data is never written under another's key.
 */
let cacheWritesEnabled = false;
export function setCacheWritesEnabled(on: boolean) {
  cacheWritesEnabled = on;
}
const userCacheStorage = {
  getItem: (name: string) => AsyncStorage.getItem(name),
  setItem: (name: string, value: string) => (cacheWritesEnabled ? AsyncStorage.setItem(name, value) : Promise.resolve()),
  removeItem: (name: string) => AsyncStorage.removeItem(name),
};
export const userCacheKey = (userId: string) => `glowup-daily:user:${userId}`;

const todayPlanOf = (s: Pick<PersistedState, 'tasks' | 'dayPlan'>, date: string) => activeTasksFor(s.tasks, s.dayPlan, date);
const winText = (n: number) => `+${n} Win${n === 1 ? '' : 's'} ✨`;

export function presetById(id: string) {
  return focusPresets.find((p) => p.id === id) ?? focusPresets[0];
}

export const useGlowStore = create<GlowState>()(
  persist(
    (set, get) => ({
      ...createEmptyState(),
      hydrated: false,
      toasts: [],

      pushToast: (text, kind = 'win') => set((s) => ({ toasts: [...s.toasts.slice(-3), { id: uid('toast'), text, kind }] })),
      dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      toggleTask: (taskId) => {
        const date = todayKey();
        const state = get();
        const { events } = state;
        const task = todayPlanOf(state, date).find((t) => t.id === taskId) ?? state.tasks.find((t) => t.id === taskId);
        if (!task) return false;
        if (isDone(events, date, 'task', taskId)) {
          set({ events: events.filter((e) => !(e.date === date && e.source === 'task' && e.refId === taskId)) });
          return false;
        }
        const amount = task.wins ?? 1;
        const ev: WinEvent = { id: uid('w'), date, ts: Date.now(), source: 'task', refId: taskId, amount, category: task.category, label: task.title };
        set({ events: [...events, ev] });
        get().pushToast(winText(amount));
        return true;
      },

      addTask: (input) =>
        set((s) => {
          const task: Task = { ...input, id: uid('t'), order: Math.max(-1, ...s.tasks.map((t) => t.order)) + 1, custom: true };
          const date = todayKey();
          const inPlan = s.dayPlan?.date === date && isTaskScheduled(task, weekdayOf(date));
          return {
            tasks: [...s.tasks, task],
            dayPlan: inPlan && s.dayPlan ? { ...s.dayPlan, tasks: [...s.dayPlan.tasks, { ...task, order: Math.max(-1, ...s.dayPlan.tasks.map((t) => t.order)) + 1 }] } : s.dayPlan,
          };
        }),

      updateTask: (id, input) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...input } : t)),
          dayPlan: s.dayPlan ? { ...s.dayPlan, tasks: s.dayPlan.tasks.map((t) => (t.id === id ? { ...t, ...input } : t)) } : null,
        })),

      deleteTask: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          dayPlan: s.dayPlan ? { ...s.dayPlan, tasks: s.dayPlan.tasks.filter((t) => t.id !== id) } : null,
          events: s.events.filter((e) => !(e.source === 'task' && e.refId === id && e.date === todayKey())),
        })),

      moveTask: (id, direction, scopeIds) => {
        const { tasks } = get();
        const scope = tasks.filter((t) => scopeIds.includes(t.id)).sort((a, b) => a.order - b.order);
        const idx = scope.findIndex((t) => t.id === id);
        const swapWith = scope[idx + direction];
        if (idx < 0 || !swapWith) return;
        const a = scope[idx];
        set({
          tasks: tasks.map((t) => (t.id === a.id ? { ...t, order: swapWith.order } : t.id === swapWith.id ? { ...t, order: a.order } : t)),
        });
      },

      toggleTaskDay: (id, day) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const has = t.days.includes(day);
            if (has && t.days.length === 1) return t;
            return { ...t, days: has ? t.days.filter((d) => d !== day) : [...t.days, day].sort() };
          }),
        })),

      setEnergyMode: (mode) => set((s) => ({ dayModes: { ...s.dayModes, [todayKey()]: mode } })),

      toggleRoutineStep: (stepId) => {
        const date = todayKey();
        const { routineSteps, events } = get();
        const step = routineSteps.find((r) => r.id === stepId);
        if (!step) return 'locked';
        const shelf = routineSteps.filter((r) => r.routine === step.routine).sort((a, b) => a.order - b.order);
        const doneFlags = shelf.map((r) => isDone(events, date, 'routine', r.id));
        const idx = shelf.findIndex((r) => r.id === stepId);
        if (doneFlags[idx]) {
          const laterDone = doneFlags.slice(idx + 1).some(Boolean);
          if (laterDone) return 'locked';
          set({ events: events.filter((e) => !(e.date === date && e.source === 'routine' && e.refId === stepId)) });
          return 'undone';
        }
        if (doneFlags.slice(0, idx).some((d) => !d)) return 'locked';
        const ev: WinEvent = { id: uid('w'), date, ts: Date.now(), source: 'routine', refId: stepId, amount: 1, category: 'selfcare', label: step.title };
        set({ events: [...events, ev] });
        const finished = idx === shelf.length - 1;
        get().pushToast(finished ? `+1 Win ✨ ${step.routine.toUpperCase()} shelf complete!` : '+1 Win ✨');
        return 'done';
      },

      addRoutineStep: (routine, title, emoji) =>
        set((s) => ({
          routineSteps: [
            ...s.routineSteps,
            { id: uid('r'), routine, title, emoji, order: Math.max(-1, ...s.routineSteps.filter((r) => r.routine === routine).map((r) => r.order)) + 1 },
          ],
        })),

      removeRoutineStep: (stepId) =>
        set((s) => ({
          routineSteps: s.routineSteps.filter((r) => r.id !== stepId),
          events: s.events.filter((e) => !(e.source === 'routine' && e.refId === stepId && e.date === todayKey())),
        })),

      setTimerPreset: (presetId) =>
        set((s) => (s.timer.phase !== 'idle' ? s : { timer: { ...s.timer, presetId, phaseDurationSec: presetById(presetId).focusMin * 60 } })),
      setTimerSubject: (subject) => set((s) => (s.timer.phase !== 'idle' ? s : { timer: { ...s.timer, subject } })),
      addSubject: (subject) => {
        const clean = subject.trim();
        if (!clean) return;
        set((s) => ({
          subjects: s.subjects.includes(clean) ? s.subjects : [...s.subjects, clean],
          timer: s.timer.phase === 'idle' ? { ...s.timer, subject: clean } : s.timer,
        }));
      },
      startTimer: () =>
        set((s) => {
          const sec = presetById(s.timer.presetId).focusMin * 60;
          return { timer: { ...s.timer, phase: 'focus', phaseDurationSec: sec, endsAt: Date.now() + sec * 1000, pausedRemaining: null } };
        }),
      pauseTimer: () =>
        set((s) => {
          if (!s.timer.endsAt) return s;
          return { timer: { ...s.timer, pausedRemaining: Math.max(0, (s.timer.endsAt - Date.now()) / 1000), endsAt: null } };
        }),
      resumeTimer: () =>
        set((s) => {
          if (s.timer.pausedRemaining == null) return s;
          return { timer: { ...s.timer, endsAt: Date.now() + s.timer.pausedRemaining * 1000, pausedRemaining: null } };
        }),
      resetTimer: () => set((s) => ({ timer: { ...idleTimer, presetId: s.timer.presetId, subject: s.timer.subject, phaseDurationSec: presetById(s.timer.presetId).focusMin * 60 } })),
      finishTimerPhase: () => {
        const { timer } = get();
        const preset = presetById(timer.presetId);
        if (timer.phase === 'focus') {
          const date = todayKey();
          const now = Date.now();
          const subject = timer.subject || DEFAULT_FOCUS_SUBJECT;
          const session: FocusSession = { id: uid('fs'), date, ts: now, subject, minutes: Math.round(timer.phaseDurationSec / 60), presetId: preset.id };
          const ev: WinEvent = { id: uid('w'), date, ts: now, source: 'focus', refId: session.id, amount: 2, category: 'studies', label: `${preset.name}: ${subject}` };
          const breakSec = preset.breakMin * 60;
          set((s) => ({
            focusSessions: [...s.focusSessions, session],
            events: [...s.events, ev],
            timer: { ...s.timer, phase: 'break', phaseDurationSec: breakSec, endsAt: now + breakSec * 1000, pausedRemaining: null },
          }));
          get().pushToast(`+2 Wins 📚 ${session.minutes}m of ${subject}`, 'focus');
        } else if (timer.phase === 'break') {
          get().resetTimer();
          get().pushToast('Break done. Ready for another sprint? 🌿', 'info');
        }
      },

      logMovement: ({ sport, minutes, vibe, note }) => {
        const date = todayKey();
        const now = Date.now();
        const state = get();
        const { events } = state;
        const linked = todayPlanOf(state, date)
          .filter((t) => t.sport === sport)
          .find((t) => !isDone(events, date, 'task', t.id));
        const ev: WinEvent = linked
          ? { id: uid('w'), date, ts: now, source: 'task', refId: linked.id, amount: linked.wins ?? 1, category: 'movement', label: linked.title }
          : { id: uid('w'), date, ts: now, source: 'movement', refId: sport, amount: 1, category: 'movement', label: `${sportMeta[sport].label} ${minutes}m` };
        const session: MovementSession = { id: uid('mv'), date, ts: now, sport, minutes, vibe, note: note.trim(), winEventId: ev.id };
        set((s) => ({ events: [...s.events, ev], movementSessions: [...s.movementSessions, session] }));
        get().pushToast(`+${ev.amount} Win${ev.amount === 1 ? '' : 's'} ${vibe} ${sportMeta[sport].label} logged`);
      },

      deleteMovement: (id) =>
        set((s) => {
          const session = s.movementSessions.find((m) => m.id === id);
          return {
            movementSessions: s.movementSessions.filter((m) => m.id !== id),
            events: session ? s.events.filter((e) => e.id !== session.winEventId) : s.events,
          };
        }),

      addGoal: (input) =>
        set((s) => ({
          goals: [
            ...s.goals,
            {
              id: uid('g'),
              title: input.title.trim(),
              emoji: input.emoji,
              category: input.category,
              createdAt: Date.now(),
              milestones: input.milestones.map((m) => m.trim()).filter(Boolean).map((title) => ({ id: uid('m'), title, doneAt: null })),
            },
          ],
        })),

      updateGoal: (id, input) =>
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== id) return g;
            const titles = input.milestones.map((m) => m.trim()).filter(Boolean);
            const milestones = titles.map((title, i) => {
              const prev = g.milestones[i];
              return prev ? { ...prev, title } : { id: uid('m'), title, doneAt: null };
            });
            return { ...g, title: input.title.trim(), emoji: input.emoji, category: input.category, milestones };
          }),
        })),

      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),

      toggleMilestone: (goalId, milestoneId) => {
        const { goals, events } = get();
        const goal = goals.find((g) => g.id === goalId);
        const ms = goal?.milestones.find((m) => m.id === milestoneId);
        if (!goal || !ms) return false;
        const nowDone = !ms.doneAt;
        const now = Date.now();
        const nextGoals = goals.map((g) =>
          g.id !== goalId ? g : { ...g, milestones: g.milestones.map((m) => (m.id === milestoneId ? { ...m, doneAt: nowDone ? now : null } : m)) },
        );
        if (nowDone) {
          const ev: WinEvent = { id: uid('w'), date: todayKey(), ts: now, source: 'milestone', refId: milestoneId, amount: 3, category: goal.category, label: ms.title };
          set({ goals: nextGoals, events: [...events, ev] });
          const allDone = nextGoals.find((g) => g.id === goalId)!.milestones.every((m) => m.doneAt);
          get().pushToast(allDone ? `+3 Super Win 🌟 "${goal.title}" complete!` : '+3 Super Win 🌟', 'super');
        } else {
          set({ goals: nextGoals, events: events.filter((e) => !(e.source === 'milestone' && e.refId === milestoneId)) });
        }
        return nowDone;
      },

      applyAIRemix: async (input) => {
        const date = todayKey();
        const state = get();
        const active = todayPlanOf(state, date);
        const ctx = {
          tasks: active,
          doneIds: doneTaskIds(state.events, date),
          subject: state.timer.subject || DEFAULT_FOCUS_SUBJECT,
          shelfWins: (mode: EnergyMode) => shelfWinsFor(state.routineSteps, mode),
        };
        const apiKey = state.aiSettings.provider === 'off' ? null : await getApiKey();
        const result = await planDay(input, ctx, state.aiSettings, apiKey);
        const latest = get();
        set({
          previousTasksSnapshot: {
            date,
            plan: latest.dayPlan?.date === date ? latest.dayPlan.tasks : null,
            mode: modeOn(latest.dayModes, date),
            profile: latest.aiScheduleProfile?.date === date ? latest.aiScheduleProfile : null,
          },
          dayPlan: { date, tasks: result.tasks },
          dayModes: { ...latest.dayModes, [date]: result.energyMode },
          aiScheduleProfile: {
            ...input,
            date,
            appliedAt: Date.now(),
            engine: result.engine,
            summary: result.summary,
            changes: result.changes,
            fallbackReason: result.fallbackReason,
          },
        });
        get().pushToast(result.fallbackReason ? '✨ Day remixed with Smart Rules' : '✨ Your day is remixed', 'super');
        return result;
      },

      revertAIRemix: () => {
        const date = todayKey();
        const s = get();
        const snap = s.previousTasksSnapshot;
        if (!snap || snap.date !== date) return;
        const base = snap.plan ?? activeTasksFor(s.tasks, null, date);
        const baseIds = new Set(base.map((t) => t.id));
        const done = doneTaskIds(s.events, date);
        const keptWins = (s.dayPlan?.date === date ? s.dayPlan.tasks : []).filter((t) => done.has(t.id) && !baseIds.has(t.id));
        set({
          dayPlan: snap.plan || keptWins.length ? { date, tasks: [...base, ...keptWins.map((t, i) => ({ ...t, tier: 1 as const, order: base.length + i }))] } : null,
          dayModes: { ...s.dayModes, [date]: snap.mode },
          aiScheduleProfile: snap.profile,
          previousTasksSnapshot: null,
        });
        get().pushToast(keptWins.length ? '↩️ Remix undone. Wins you earned stay' : '↩️ AI Remix undone', 'info');
      },

      splitTaskIntoMicroWins: (taskId) => {
        const date = todayKey();
        const s = get();
        const active = todayPlanOf(s, date);
        const task = active.find((t) => t.id === taskId);
        if (!task || isDone(s.events, date, 'task', taskId)) return;
        const steps = splitIntoMicroWins(task);
        const tasks = active.flatMap((t) => (t.id === taskId ? steps : [t])).map((t, i) => ({ ...t, order: i }));
        set({ dayPlan: { date, tasks } });
        get().pushToast('✨ Split into 3 micro-wins', 'info');
      },

      completeQuickWin: (candidate, beatTimer) => {
        const date = todayKey();
        const now = Date.now();
        if (candidate.taskId) {
          if (!isDone(get().events, date, 'task', candidate.taskId)) get().toggleTask(candidate.taskId);
        } else {
          const ev: WinEvent = { id: uid('w'), date, ts: now, source: 'roulette', refId: candidate.key, amount: 1, category: candidate.category, label: candidate.title };
          set((s) => ({ events: [...s.events, ev] }));
          get().pushToast(winText(1));
        }
        if (beatTimer) {
          const bonus: WinEvent = { id: uid('w'), date, ts: now, source: 'bonus', refId: candidate.key, amount: 2, category: candidate.category, label: 'Momentum bonus' };
          set((s) => ({ events: [...s.events, bonus] }));
          get().pushToast('+2 Momentum Win ⚡', 'super');
        }
      },

      setAISettings: (patch) => set((s) => ({ aiSettings: { ...s.aiSettings, ...patch } })),

      setUserName: (name) => set({ userName: name.trim() }),

      completeOnboarding: ({ name, tasks, steps }) =>
        set((s) => {
          const baseOrder = Math.max(-1, ...s.tasks.map((t) => t.order)) + 1;
          const newTasks: Task[] = tasks.map((t, i) => ({ ...t, id: uid('t'), order: baseOrder + i, custom: true }));
          const newSteps: RoutineStep[] = steps.map((st, i) => ({
            ...st,
            id: uid('r'),
            order: Math.max(-1, ...s.routineSteps.filter((r) => r.routine === st.routine).map((r) => r.order)) + 1 + i,
          }));
          return { userName: name.trim(), onboarded: true, tasks: [...s.tasks, ...newTasks], routineSteps: [...s.routineSteps, ...newSteps] };
        }),

      replaceUserData: (data) => set({ ...data, toasts: [] }),
    }),
    {
      name: 'glowup-daily:signed-out',
      version: 2,
      skipHydration: true,
      storage: createJSONStorage(() => userCacheStorage),
      partialize: ({ hydrated, toasts, ...rest }) => {
        const persisted: Partial<GlowState> = {};
        for (const [k, v] of Object.entries(rest)) if (typeof v !== 'function') (persisted as Record<string, unknown>)[k] = v;
        return persisted as PersistedState;
      },
    },
  ),
);
