import { hasServerFields, mergeDevicePhotos } from '../lib/hard75';
import { DEFAULT_MODELS } from '../services/aiPlannerService';
import { createEmptyState, type PersistedState } from '../store/useGlowStore';
import type { AIProvider, DayPlan, Goal, Milestone, SeventyFiveHardDayLog, SeventyFiveHardMode, Task, TimerState } from '../types';

export type Row = Record<string, unknown>;

export interface TableSpec {
  table: string;
  /** Columns (besides user_id) that identify a row; used for upsert conflicts and deletes. */
  key: 'id' | 'date' | null;
  extract: (s: PersistedState) => Row[];
}

const n = <T>(v: T | undefined | null) => (v === undefined ? null : v);

export const tableSpecs: TableSpec[] = [
  {
    table: 'user_settings',
    key: null,
    extract: (s) => [
      {
        display_name: s.userName,
        onboarded: s.onboarded,
        subjects: s.subjects,
        day_modes: s.dayModes,
        timer: s.timer,
        ai_provider: s.aiSettings.provider,
        ai_model: s.aiSettings.model,
        ai_schedule_profile: n(s.aiScheduleProfile),
        previous_tasks_snapshot: n(s.previousTasksSnapshot),
      },
    ],
  },
  {
    table: 'tasks',
    key: 'id',
    extract: (s) =>
      s.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        emoji: t.emoji,
        category: t.category,
        time_of_day: t.timeOfDay,
        tier: t.tier,
        days: [...t.days].sort((a, b) => a - b),
        position: t.order,
        sport: n(t.sport),
        custom: t.custom,
        wins: t.wins ?? 1,
        minutes: n(t.minutes),
      })),
  },
  {
    table: 'routine_steps',
    key: 'id',
    extract: (s) => s.routineSteps.map((r) => ({ id: r.id, routine: r.routine, title: r.title, emoji: r.emoji, position: r.order })),
  },
  {
    table: 'goals',
    key: 'id',
    extract: (s) => s.goals.map((g) => ({ id: g.id, title: g.title, emoji: g.emoji, category: g.category, created_at_ms: g.createdAt })),
  },
  {
    table: 'milestones',
    key: 'id',
    extract: (s) => s.goals.flatMap((g) => g.milestones.map((m, i) => ({ id: m.id, goal_id: g.id, title: m.title, done_at: n(m.doneAt), position: i }))),
  },
  {
    table: 'win_events',
    key: 'id',
    extract: (s) => s.events.map((e) => ({ id: e.id, date: e.date, ts: e.ts, source: e.source, ref_id: e.refId, amount: e.amount, category: e.category, label: e.label })),
  },
  {
    table: 'focus_sessions',
    key: 'id',
    extract: (s) => s.focusSessions.map((f) => ({ id: f.id, date: f.date, ts: f.ts, subject: f.subject, minutes: Math.round(f.minutes), preset_id: f.presetId })),
  },
  {
    table: 'movement_sessions',
    key: 'id',
    extract: (s) =>
      s.movementSessions.map((m) => ({ id: m.id, date: m.date, ts: m.ts, sport: m.sport, minutes: m.minutes, vibe: m.vibe, note: m.note, win_event_id: m.winEventId })),
  },
  {
    table: 'day_plans',
    key: 'date',
    extract: (s) => (s.dayPlan ? [{ date: s.dayPlan.date, tasks: s.dayPlan.tasks }] : []),
  },
  {
    table: 'hard75_settings',
    key: null,
    extract: (s) => [
      {
        active: s.seventyFiveHard.isActive,
        start_date: s.seventyFiveHard.startDate,
        mode: s.seventyFiveHard.mode,
        photos_blurred: s.seventyFiveHard.photosBlurred,
      },
    ],
  },
  {
    table: 'hard75_logs',
    key: 'date',
    extract: (s) =>
      Object.entries(s.seventyFiveHard.dailyLogs)
        .filter(([, log]) => hasServerFields(log))
        .map(([date, log]) => ({
          date,
          rule1_diet: log.rule1Diet,
          rule2_workout1: log.rule2Workout1,
          rule2_workout2_outdoor: log.rule2Workout2Outdoor,
          rule3_water: log.rule3WaterGallon,
          water_oz: log.waterOzLogged,
          rule4_read: log.rule4Read10Pages,
          book_note: log.bookNote,
          rule5_photo: log.rule5ProgressPic,
          completed_at: log.completedAt ?? null,
        })),
  },
];

export const rowKey = (spec: TableSpec, row: Row) => (spec.key ? String(row[spec.key]) : 'me');

/** Deterministic JSON so jsonb key reordering on the server never looks like a change. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .filter((k) => obj[k] !== undefined)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

const num = (v: unknown) => (v === null || v === undefined ? undefined : Number(v));

/** Rebuilds app state from server rows; device-only fields (AI key presence, running toasts) are kept from `local`. */
export function rowsToState(rows: Record<string, Row[]>, local: PersistedState, today: string): PersistedState {
  const empty = createEmptyState();
  const settings = rows.user_settings?.[0];
  const milestonesByGoal = new Map<string, Milestone[]>();
  for (const m of [...(rows.milestones ?? [])].sort((a, b) => Number(a.position) - Number(b.position))) {
    const list = milestonesByGoal.get(String(m.goal_id)) ?? [];
    list.push({ id: String(m.id), title: String(m.title), doneAt: m.done_at === null ? null : Number(m.done_at) });
    milestonesByGoal.set(String(m.goal_id), list);
  }
  const plan = (rows.day_plans ?? []).find((p) => p.date === today);
  const provider = (settings?.ai_provider as AIProvider) ?? 'off';
  return {
    tasks: (rows.tasks ?? []).map(
      (r): Task => ({
        id: String(r.id),
        title: String(r.title),
        emoji: String(r.emoji),
        category: r.category as Task['category'],
        timeOfDay: r.time_of_day as Task['timeOfDay'],
        tier: Number(r.tier) as Task['tier'],
        days: (r.days as number[]).map(Number).sort((a, b) => a - b) as Task['days'],
        order: Number(r.position),
        sport: (r.sport as Task['sport']) ?? undefined,
        custom: Boolean(r.custom),
        wins: Number(r.wins),
        minutes: num(r.minutes),
      }),
    ),
    routineSteps: (rows.routine_steps ?? []).map((r) => ({
      id: String(r.id),
      routine: r.routine as 'am' | 'pm',
      title: String(r.title),
      emoji: String(r.emoji),
      order: Number(r.position),
    })),
    goals: (rows.goals ?? []).map(
      (g): Goal => ({
        id: String(g.id),
        title: String(g.title),
        emoji: String(g.emoji),
        category: g.category as Goal['category'],
        createdAt: Number(g.created_at_ms),
        milestones: milestonesByGoal.get(String(g.id)) ?? [],
      }),
    ),
    events: (rows.win_events ?? []).map((e) => ({
      id: String(e.id),
      date: String(e.date),
      ts: Number(e.ts),
      source: e.source as PersistedState['events'][number]['source'],
      refId: String(e.ref_id),
      amount: Number(e.amount),
      category: e.category as PersistedState['events'][number]['category'],
      label: String(e.label),
    })),
    focusSessions: (rows.focus_sessions ?? []).map((f) => ({
      id: String(f.id),
      date: String(f.date),
      ts: Number(f.ts),
      subject: String(f.subject),
      minutes: Number(f.minutes),
      presetId: String(f.preset_id),
    })),
    movementSessions: (rows.movement_sessions ?? []).map((m) => ({
      id: String(m.id),
      date: String(m.date),
      ts: Number(m.ts),
      sport: m.sport as PersistedState['movementSessions'][number]['sport'],
      minutes: Number(m.minutes),
      vibe: m.vibe as PersistedState['movementSessions'][number]['vibe'],
      note: String(m.note),
      winEventId: String(m.win_event_id),
    })),
    dayPlan: plan ? ({ date: String(plan.date), tasks: plan.tasks as Task[] } satisfies DayPlan) : null,
    userName: settings ? String(settings.display_name ?? '') : empty.userName,
    onboarded: settings ? Boolean(settings.onboarded) : false,
    subjects: (settings?.subjects as string[]) ?? [],
    dayModes: (settings?.day_modes as PersistedState['dayModes']) ?? {},
    timer: (settings?.timer as TimerState) ?? empty.timer,
    aiScheduleProfile: (settings?.ai_schedule_profile as PersistedState['aiScheduleProfile']) ?? null,
    previousTasksSnapshot: (settings?.previous_tasks_snapshot as PersistedState['previousTasksSnapshot']) ?? null,
    aiSettings: {
      provider,
      model: String(settings?.ai_model || (provider === 'off' ? DEFAULT_MODELS.openai : DEFAULT_MODELS[provider])),
      hasKey: local.aiSettings.hasKey,
    },
    seventyFiveHard: hardFromRows(rows, local),
  };
}

function hardFromRows(rows: Record<string, Row[]>, local: PersistedState): PersistedState['seventyFiveHard'] {
  const settings = rows.hard75_settings?.[0];
  const logs: Record<string, SeventyFiveHardDayLog> = {};
  for (const row of rows.hard75_logs ?? []) {
    const date = String(row.date).slice(0, 10);
    logs[date] = {
      rule1Diet: Boolean(row.rule1_diet),
      rule2Workout1: Boolean(row.rule2_workout1),
      rule2Workout2Outdoor: Boolean(row.rule2_workout2_outdoor),
      rule3WaterGallon: Boolean(row.rule3_water),
      waterOzLogged: Number(row.water_oz) || 0,
      rule4Read10Pages: Boolean(row.rule4_read),
      bookNote: String(row.book_note ?? ''),
      rule5ProgressPic: Boolean(row.rule5_photo),
      completedAt: row.completed_at ? String(row.completed_at) : undefined,
    };
  }
  const mode: SeventyFiveHardMode = settings?.mode === 'soft' ? 'soft' : 'hardcore';
  return {
    isActive: settings ? Boolean(settings.active) : false,
    startDate: settings?.start_date ? String(settings.start_date).slice(0, 10) : null,
    mode,
    photosBlurred: settings ? Boolean(settings.photos_blurred) : false,
    dailyLogs: mergeDevicePhotos(logs, local.seventyFiveHard?.dailyLogs),
  };
}
