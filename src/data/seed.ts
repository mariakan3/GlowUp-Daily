import { ALL_DAYS, addDays, weekdayOf } from '../lib/date';
import { energyMeta } from '../theme';
import type {
  EnergyMode,
  FocusPreset,
  FocusSession,
  Goal,
  MovementSession,
  MovementVibe,
  RoutineStep,
  SportId,
  Task,
  WinEvent,
} from '../types';
import { isTaskVisibleInMode, isTaskScheduled } from '../lib/wins';

type SeedTask = Omit<Task, 'order' | 'custom'>;

const seedTaskList: SeedTask[] = [
  { id: 't-bed', title: 'Make the bed', emoji: '🛏️', category: 'morning', timeOfDay: 'morning', tier: 1, days: ALL_DAYS },
  { id: 't-water', title: 'Drink a glass of water', emoji: '💧', category: 'morning', timeOfDay: 'morning', tier: 1, days: ALL_DAYS },
  { id: 't-curtains', title: 'Open the curtains & let light in', emoji: '🌤️', category: 'morning', timeOfDay: 'morning', tier: 2, days: ALL_DAYS },
  { id: 't-vitamins', title: 'Take vitamins', emoji: '💊', category: 'morning', timeOfDay: 'morning', tier: 2, days: ALL_DAYS },
  { id: 't-top3', title: 'Plan top 3 priorities', emoji: '📝', category: 'morning', timeOfDay: 'morning', tier: 2, days: ALL_DAYS },
  { id: 't-coffee', title: 'Prep lunch & iced coffee', emoji: '☕', category: 'home', timeOfDay: 'morning', tier: 2, days: [1, 2, 3, 4, 5] },

  { id: 't-study', title: 'Deep study block', emoji: '📚', category: 'studies', timeOfDay: 'daytime', tier: 1, days: ALL_DAYS },
  { id: 't-refill', title: 'Refill water bottle', emoji: '🫗', category: 'morning', timeOfDay: 'daytime', tier: 1, days: ALL_DAYS },
  { id: 't-lecture', title: 'Lecture review & notes', emoji: '🎧', category: 'studies', timeOfDay: 'daytime', tier: 2, days: [1, 2, 3, 4, 5] },
  { id: 't-flashcards', title: 'Exam prep flashcards', emoji: '🗂️', category: 'studies', timeOfDay: 'daytime', tier: 2, days: ALL_DAYS },
  { id: 't-inbox', title: 'Work tasks & inbox zero', emoji: '💼', category: 'studies', timeOfDay: 'daytime', tier: 3, days: [1, 2, 3, 4, 5] },
  { id: 't-desk', title: 'Clear your desk', emoji: '🪴', category: 'home', timeOfDay: 'daytime', tier: 3, days: ALL_DAYS },
  { id: 't-pilates', title: 'Pilates reformer class', emoji: '🧘‍♀️', category: 'movement', timeOfDay: 'daytime', tier: 3, days: [1, 3, 5], sport: 'pilates' },
  { id: 't-tennis', title: 'Tennis practice', emoji: '🎾', category: 'movement', timeOfDay: 'daytime', tier: 3, days: [2, 4, 6], sport: 'tennis' },
  { id: 't-gym', title: 'Gym session', emoji: '🏋️‍♀️', category: 'movement', timeOfDay: 'daytime', tier: 3, days: [1, 4], sport: 'gym' },
  { id: 't-run', title: 'Easy 5K run', emoji: '🏃‍♀️', category: 'movement', timeOfDay: 'daytime', tier: 3, days: [2, 6], sport: 'running' },
  { id: 't-walk', title: '10k steps hot girl walk', emoji: '👟', category: 'movement', timeOfDay: 'daytime', tier: 2, days: ALL_DAYS, sport: 'walk' },

  { id: 't-cook', title: 'Cook a nourishing dinner', emoji: '🥗', category: 'home', timeOfDay: 'evening', tier: 2, days: ALL_DAYS },
  { id: 't-dishes', title: 'Dishes done, sink shiny', emoji: '🍽️', category: 'home', timeOfDay: 'evening', tier: 3, days: ALL_DAYS },
  { id: 't-reset', title: '10-minute room reset', emoji: '🧺', category: 'home', timeOfDay: 'evening', tier: 2, days: ALL_DAYS },
  { id: 't-laundry', title: 'Laundry load', emoji: '👕', category: 'home', timeOfDay: 'evening', tier: 3, days: [0, 4] },
  { id: 't-sheets', title: 'Change bedsheets', emoji: '🛌', category: 'home', timeOfDay: 'evening', tier: 3, days: [0] },
  { id: 't-stretch', title: 'Evening stretching', emoji: '🤸‍♀️', category: 'movement', timeOfDay: 'evening', tier: 2, days: ALL_DAYS },
  { id: 't-shower', title: 'Shower ritual', emoji: '🚿', category: 'selfcare', timeOfDay: 'evening', tier: 2, days: ALL_DAYS },
  { id: 't-guasha', title: 'Gua Sha & face massage', emoji: '💆‍♀️', category: 'selfcare', timeOfDay: 'evening', tier: 3, days: [1, 3, 5, 0] },
  { id: 't-hair', title: 'Hair wash & keratin mask', emoji: '💇‍♀️', category: 'selfcare', timeOfDay: 'evening', tier: 3, days: [0, 3] },
  { id: 't-hairoil', title: 'Hair oil routine', emoji: '🌸', category: 'selfcare', timeOfDay: 'evening', tier: 3, days: [2, 5] },
];

export const seedTasks: Task[] = seedTaskList.map((t, i) => ({ ...t, order: i, custom: false }));

export const seedRoutineSteps: RoutineStep[] = [
  { id: 'r-am-1', routine: 'am', title: 'Gentle cleanse', emoji: '🫧', order: 0 },
  { id: 'r-am-2', routine: 'am', title: 'Toner & vitamin C serum', emoji: '💧', order: 1 },
  { id: 'r-am-3', routine: 'am', title: 'Moisturize', emoji: '🧴', order: 2 },
  { id: 'r-am-4', routine: 'am', title: 'SPF 50', emoji: '☀️', order: 3 },
  { id: 'r-pm-1', routine: 'pm', title: 'Oil cleanse', emoji: '🫒', order: 0 },
  { id: 'r-pm-2', routine: 'pm', title: 'Second cleanse', emoji: '🫧', order: 1 },
  { id: 'r-pm-3', routine: 'pm', title: 'Retinol or peptide serum', emoji: '✨', order: 2 },
  { id: 'r-pm-4', routine: 'pm', title: 'Night cream & lip mask', emoji: '🌙', order: 3 },
];

export const focusPresets: FocusPreset[] = [
  { id: 'pomodoro', name: 'Pomodoro', focusMin: 25, breakMin: 5, emoji: '🍅' },
  { id: 'exam', name: 'Exam Grind', focusMin: 50, breakMin: 10, emoji: '🔥' },
  { id: 'sprint', name: 'Quick Sprint', focusMin: 15, breakMin: 3, emoji: '⚡' },
];

export const seedSubjects = ['Organic Chemistry', 'Statistics', 'Marketing Thesis', 'French B2', 'Internship'];

export function seedGoals(now: number): Goal[] {
  const day = 86_400_000;
  return [
    {
      id: 'g-finals',
      title: 'Ace Finals',
      emoji: '🎓',
      category: 'studies',
      createdAt: now - 20 * day,
      milestones: [
        { id: 'm-f1', title: 'Build a 4-week revision calendar', doneAt: now - 14 * day },
        { id: 'm-f2', title: 'Finish Organic Chem chapter summaries', doneAt: now - 5 * day },
        { id: 'm-f3', title: 'Do 2 timed past papers', doneAt: null },
        { id: 'm-f4', title: 'Office hours for Statistics', doneAt: null },
        { id: 'm-f5', title: 'Full mock exam week', doneAt: null },
      ],
    },
    {
      id: 'g-5k',
      title: 'Run 5K under 28 min',
      emoji: '🏃‍♀️',
      category: 'movement',
      createdAt: now - 30 * day,
      milestones: [
        { id: 'm-r1', title: 'Run 3 times a week for 2 weeks', doneAt: now - 12 * day },
        { id: 'm-r2', title: 'Hit a 30:00 5K', doneAt: now - 3 * day },
        { id: 'm-r3', title: 'Add one interval session weekly', doneAt: null },
        { id: 'm-r4', title: 'Race day: sub-28 5K', doneAt: null },
      ],
    },
    {
      id: 'g-serve',
      title: 'Level up my tennis serve',
      emoji: '🎾',
      category: 'movement',
      createdAt: now - 10 * day,
      milestones: [
        { id: 'm-s1', title: 'Film my serve & spot one fix', doneAt: now - 6 * day },
        { id: 'm-s2', title: '100 serves practice bucket', doneAt: null },
        { id: 'm-s3', title: 'Land 7/10 first serves in a match', doneAt: null },
      ],
    },
    {
      id: 'g-cook',
      title: 'Cook 4x a week at home',
      emoji: '🍳',
      category: 'home',
      createdAt: now - 8 * day,
      milestones: [
        { id: 'm-c1', title: 'Save 10 cozy weeknight recipes', doneAt: now - 7 * day },
        { id: 'm-c2', title: 'Sunday grocery & prep ritual', doneAt: null },
        { id: 'm-c3', title: 'Batch-cook lunches for a week', doneAt: null },
        { id: 'm-c4', title: 'Host a dinner for friends', doneAt: null },
      ],
    },
    {
      id: 'g-skin',
      title: 'Glass-skin glow era',
      emoji: '🫧',
      category: 'selfcare',
      createdAt: now - 4 * day,
      milestones: [
        { id: 'm-k1', title: 'Patch test new retinol', doneAt: null },
        { id: 'm-k2', title: '30 days of SPF every morning', doneAt: null },
        { id: 'm-k3', title: 'Drink 2L water 5 days in a row', doneAt: null },
      ],
    },
  ];
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const movementNotes: Record<SportId, string[]> = {
  pilates: ['Core reformer class', 'Shaking by the end, loved it', 'Long and strong flow'],
  tennis: ['Backhand felt amazing today', 'Rallied for 20 mins straight', 'Worked on toss consistency'],
  running: ['Negative splits!', 'Easy pace, podcast vibes', 'Ran by the sea'],
  gym: ['Hip thrust PR', 'Upper body + core', 'Glute day, felt powerful'],
  walk: ['Sunset walk with a matcha', 'Called mom on the walk', 'Phone-free walk'],
};

const vibeBySport: Record<SportId, MovementVibe> = {
  pilates: '🧘‍♀️',
  tennis: '🎾',
  running: '⚡',
  gym: '🔥',
  walk: '🧘‍♀️',
};

export interface SeedHistory {
  events: WinEvent[];
  focusSessions: FocusSession[];
  movementSessions: MovementSession[];
  dayModes: Record<string, EnergyMode>;
}

/**
 * Builds two weeks of believable history ending today. The last 8 days all hit their target so the
 * streak reads "8 Day Streak" on first launch; day -9 is a deliberate miss.
 */
export function buildSeedHistory(today: string, now: number, goals: Goal[]): SeedHistory {
  const rand = mulberry32(20261118);
  const events: WinEvent[] = [];
  const focusSessions: FocusSession[] = [];
  const movementSessions: MovementSession[] = [];
  const dayModes: Record<string, EnergyMode> = {};
  let n = 0;
  const id = (p: string) => `${p}-seed-${n++}`;

  const modePlan: EnergyMode[] = ['balanced', 'high', 'balanced', 'soft', 'high', 'balanced', 'balanced', 'high', 'balanced', 'balanced', 'soft', 'high', 'balanced'];

  for (let offset = 13; offset >= 0; offset--) {
    const date = addDays(today, -offset);
    const dayStart = now - offset * 86_400_000;
    const ts = (hour: number) => dayStart - (new Date(now).getHours() - hour) * 3_600_000 + Math.floor(rand() * 1_800_000);
    const mode: EnergyMode = offset === 0 ? 'balanced' : modePlan[(offset - 1) % modePlan.length];
    dayModes[date] = mode;

    if (offset === 0) {
      for (const [taskId, hour] of [['t-bed', 7], ['t-water', 7]] as const) {
        const t = seedTasks.find((x) => x.id === taskId)!;
        events.push({ id: id('w'), date, ts: ts(hour), source: 'task', refId: t.id, amount: 1, category: t.category, label: t.title });
      }
      events.push({ id: id('w'), date, ts: ts(8), source: 'routine', refId: 'r-am-1', amount: 1, category: 'selfcare', label: 'Gentle cleanse' });
      continue;
    }

    const missed = offset === 9;
    const target = energyMeta[mode].target;
    const goalWins = missed ? 5 : target + Math.floor(rand() * 4);
    const weekday = weekdayOf(date);
    const candidates = seedTasks.filter((t) => isTaskScheduled(t, weekday) && isTaskVisibleInMode(t, mode));
    let wins = 0;

    const amSteps = seedRoutineSteps.filter((s) => s.routine === 'am');
    const pmSteps = seedRoutineSteps.filter((s) => s.routine === 'pm');
    const amCount = mode === 'soft' ? 4 : 3 + Math.floor(rand() * 2);
    for (const s of amSteps.slice(0, missed ? 1 : amCount)) {
      events.push({ id: id('w'), date, ts: ts(8), source: 'routine', refId: s.id, amount: 1, category: 'selfcare', label: s.title });
      wins++;
    }

    const shuffled = [...candidates].sort((a, b) => a.tier - b.tier || rand() - 0.5);
    for (const t of shuffled) {
      if (wins >= goalWins - (mode === 'soft' ? 0 : 2)) break;
      const hour = t.timeOfDay === 'morning' ? 8 : t.timeOfDay === 'daytime' ? 13 : 20;
      const ev: WinEvent = { id: id('w'), date, ts: ts(hour), source: 'task', refId: t.id, amount: 1, category: t.category, label: t.title };
      events.push(ev);
      wins++;
      if (t.sport) {
        const minutes = t.sport === 'walk' ? 45 : [45, 60, 50][Math.floor(rand() * 3)];
        const notes = movementNotes[t.sport];
        movementSessions.push({
          id: id('mv'),
          date,
          ts: ev.ts,
          sport: t.sport,
          minutes,
          vibe: vibeBySport[t.sport],
          note: rand() > 0.35 ? notes[Math.floor(rand() * notes.length)] : '',
          winEventId: ev.id,
        });
      }
    }

    if (!missed) {
      const blocks = mode === 'soft' ? 1 : mode === 'high' ? 2 : 1 + Math.floor(rand() * 2);
      for (let b = 0; b < blocks; b++) {
        const subject = seedSubjects[Math.floor(rand() * 3)];
        const preset = rand() > 0.5 ? focusPresets[1] : focusPresets[0];
        const fid = id('fs');
        const t = ts(10 + b * 3);
        focusSessions.push({ id: fid, date, ts: t, subject, minutes: preset.focusMin, presetId: preset.id });
        events.push({ id: id('w'), date, ts: t, source: 'focus', refId: fid, amount: 2, category: 'studies', label: `${preset.name}: ${subject}` });
        wins += 2;
      }
      for (const s of pmSteps.slice(0, mode === 'soft' ? 2 : 4)) {
        if (wins >= goalWins) break;
        events.push({ id: id('w'), date, ts: ts(22), source: 'routine', refId: s.id, amount: 1, category: 'selfcare', label: s.title });
        wins++;
      }
    }
  }

  for (const g of goals) {
    for (const m of g.milestones) {
      if (!m.doneAt) continue;
      const offset = Math.round((now - m.doneAt) / 86_400_000);
      const date = addDays(today, -offset);
      events.push({ id: id('w'), date, ts: m.doneAt, source: 'milestone', refId: m.id, amount: 3, category: g.category, label: m.title });
    }
  }

  return { events, focusSessions, movementSessions, dayModes };
}
