import { ALL_DAYS } from '../lib/date';
import { uid } from '../lib/id';
import { energyMeta, timeOfDayOrder } from '../theme';
import type {
  AISettings,
  BatteryLevel,
  CategoryId,
  DayPresetId,
  EnergyMode,
  HomeTime,
  MovementPick,
  PlannerEngine,
  RemixInput,
  RemixResult,
  SportId,
  Task,
  TaskTier,
  TimeOfDay,
} from '../types';

// ─── Presets & option metadata (shared with the UI) ─────────────────────────────────────────────

export const dayPresets: Record<
  DayPresetId,
  { label: string; emoji: string; blurb: string; battery: BatteryLevel; movement: MovementPick; homeTime: HomeTime }
> = {
  exam: { label: 'Exam Week / Study Crunch', emoji: '📚', blurb: 'Deep focus, low-friction chores, brain breaks', battery: 'medium', movement: 'run', homeTime: 10 },
  thatgirl: { label: 'That Girl Era (Full Send)', emoji: '⚡', blurb: 'Max output, full sport, full PM routine, home reset', battery: 'unstoppable', movement: 'gym', homeTime: 60 },
  cozy: { label: 'Soft & Cozy Reset', emoji: '🧸', blurb: 'Low battery, PMS or recovery. Gentle wins only', battery: 'low', movement: 'rest', homeTime: 10 },
  busy: { label: 'Booked & Busy On-The-Go', emoji: '🏃‍♀️', blurb: '5-minute wins between lectures and meetings', battery: 'medium', movement: 'run', homeTime: 10 },
};
export const presetOrder: DayPresetId[] = ['exam', 'thatgirl', 'cozy', 'busy'];

export const batteryOptions: { value: BatteryLevel; label: string; pct: number }[] = [
  { value: 'low', label: 'Low', pct: 30 },
  { value: 'medium', label: 'Medium', pct: 65 },
  { value: 'unstoppable', label: 'Unstoppable', pct: 100 },
];

export const movementOptions: { value: MovementPick; label: string; emoji: string }[] = [
  { value: 'tennis', label: 'Tennis', emoji: '🎾' },
  { value: 'pilates', label: 'Pilates', emoji: '🧘‍♀️' },
  { value: 'gym', label: 'Gym', emoji: '🏋️‍♀️' },
  { value: 'run', label: 'Run/Walk', emoji: '👟' },
  { value: 'rest', label: 'Rest Day', emoji: '🍵' },
];

export const homeTimeOptions: { value: HomeTime; label: string; hint: string }[] = [
  { value: 10, label: '10 mins', hint: 'Survival' },
  { value: 30, label: '30 mins', hint: 'Quick Meal & Tidy' },
  { value: 60, label: '60+ mins', hint: 'Chef Mode' },
];

export const DEFAULT_MODELS: Record<Exclude<AISettings['provider'], 'off'>, string> = {
  openai: 'gpt-4.1-mini',
  gemini: 'gemini-2.5-flash',
};

const batteryMode: Record<BatteryLevel, EnergyMode> = { low: 'soft', medium: 'balanced', unstoppable: 'high' };
const tierCap: Record<EnergyMode, TaskTier> = { soft: 1, balanced: 2, high: 3 };

// ─── Natural-language parser ────────────────────────────────────────────────────────────────────

export interface ParsedPrompt {
  exam: boolean;
  examTomorrow: boolean;
  studyHours: number | null;
  battery: BatteryLevel | null;
  busy: boolean;
  cozy: boolean;
  movement: MovementPick | null;
  movementTime: string | null;
  skipCleaning: boolean;
  homeTime: HomeTime | null;
}

const has = (text: string, re: RegExp) => re.test(text);

function parseTime(text: string, anchor: number): string | null {
  const slice = text.slice(anchor, anchor + 40);
  const m = slice.match(/\b(?:at|@|around|by)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  return `${m[1]}${m[2] ? `:${m[2]}` : ''}${m[3] ? m[3].toLowerCase() : ''}`;
}

export function parsePrompt(raw: string): ParsedPrompt {
  const text = raw.toLowerCase();
  const exam = has(text, /\b(exams?|finals?|midterms?|tests?|deadline|thesis|revision|revise|crunch|due tomorrow|assignment|essay)\b/);
  const examTomorrow = has(text, /\b(exams?|finals?|test|midterm)\b[^.]*\btomorrow\b|\btomorrow\b[^.]*\b(exams?|finals?|test|midterm)\b/);

  let studyHours: number | null = null;
  const hm = text.match(/(\d+(?:\.\d+)?)\s*(?:h\b|hrs?\b|hours?\b)(?:[^.,]{0,30}\b(stud|revis|work|read|writ|lectur|prep)\w*)?/);
  if (hm && (hm[2] || has(text, /stud|revis|exam|final|work|thesis/))) studyHours = Math.min(10, parseFloat(hm[1]));

  let battery: BatteryLevel | null = null;
  if (has(text, /\b(exhausted|tired|drained|low energy|low battery|pms|cramps?|sick|ill|burn(?:t|ed) out|overwhelmed|hungover|sleepy|no energy|period)\b/)) battery = 'low';
  else if (has(text, /\b(energi[sz]ed|motivated|full send|unstoppable|amazing|great energy|pumped|on fire|that girl)\b/)) battery = 'unstoppable';

  const busy = has(text, /\b(busy|back[- ]to[- ]back|meetings?|lectures?|on the go|commut\w*|errands|running around|booked)\b/);
  const cozy = has(text, /\b(cozy|cosy|rest|recover\w*|gentle|soft day|self[- ]care day)\b/) && !has(text, /rest of/);

  const sports: [MovementPick, RegExp][] = [
    ['tennis', /\btennis|padel|match\b/],
    ['pilates', /\bpilates|reformer|barre|yoga\b/],
    ['gym', /\bgym|weights|lifting|strength|leg day\b/],
    ['run', /\brun\b|\brunning\b|\bjog|\bwalk\b|\b5k\b|\b10k\b/],
  ];
  let movement: MovementPick | null = null;
  let movementTime: string | null = null;
  let firstIdx = Infinity;
  for (const [pick, re] of sports) {
    const m = re.exec(text);
    if (m && m.index < firstIdx) {
      firstIdx = m.index;
      movement = pick;
      movementTime = parseTime(text, m.index);
    }
  }
  if (!movement && has(text, /\b(rest day|skip (?:the )?(?:gym|workout)|no workout|day off)\b/)) movement = 'rest';

  const skipCleaning = has(text, /\b(skip|no|avoid)\b[^.]{0,20}\b(clean\w*|chores?|laundry|tidy\w*)\b/);
  let homeTime: HomeTime | null = null;
  if (has(text, /\b(no time|takeaway|takeout|order in|skip cooking|no cooking)\b/)) homeTime = 10;
  else if (has(text, /\b(meal prep|cook(?:ing)? from scratch|chef|new recipe|host\w*)\b/)) homeTime = 60;
  else if (has(text, /\b(quick meal|simple dinner)\b/)) homeTime = 30;

  return { exam, examTomorrow, studyHours, battery, busy, cozy, movement, movementTime, skipCleaning, homeTime };
}

/** Typed details beat pills: "Pilates at 6pm" in the chat box wins over the Tennis pill. */
export function resolveInput(input: RemixInput) {
  const parsed = parsePrompt(input.prompt);
  const preset = input.presetId ?? (parsed.exam ? 'exam' : parsed.busy ? 'busy' : parsed.cozy ? 'cozy' : null);
  const battery = parsed.battery ?? input.battery;
  const movement = parsed.movement ?? input.movement;
  const homeTime = parsed.homeTime ?? (parsed.skipCleaning ? 10 : input.homeTime);
  const exam = preset === 'exam' || parsed.exam;
  const busy = preset === 'busy' || parsed.busy;
  const cozy = preset === 'cozy' || battery === 'low';
  return { parsed, preset, battery, movement, homeTime, exam, busy, cozy, mode: batteryMode[battery] };
}

// ─── Rule tables ────────────────────────────────────────────────────────────────────────────────

interface Template {
  title: string;
  emoji: string;
  category: CategoryId;
  timeOfDay: TimeOfDay;
  wins?: number;
  minutes?: number;
  sport?: SportId;
}

/** Friction scaling: high-effort chores → 2–10 minute micro-wins. */
const compressions: [RegExp, Template][] = [
  [/cook|dinner|meal/i, { title: 'Assemble a 10-min nourishing bowl or snack plate', emoji: '🥣', category: 'home', timeOfDay: 'evening', minutes: 10 }],
  [/dish|sink/i, { title: 'Rinse 5 dishes, then you are done', emoji: '🍽️', category: 'home', timeOfDay: 'evening', minutes: 3 }],
  [/reset|clean|tidy/i, { title: '3-min desk clear & fresh water refill', emoji: '🧽', category: 'home', timeOfDay: 'evening', minutes: 3 }],
  [/laundry/i, { title: 'Toss one laundry load in (2 min)', emoji: '👕', category: 'home', timeOfDay: 'evening', minutes: 2 }],
  [/sheet/i, { title: 'Fluff pillows & open a window', emoji: '🪟', category: 'home', timeOfDay: 'evening', minutes: 2 }],
  [/lunch|coffee|prep/i, { title: 'Grab a banana & fill your bottle', emoji: '🍌', category: 'home', timeOfDay: 'morning', minutes: 2 }],
  [/desk/i, { title: 'Clear 3 things off your desk', emoji: '🪴', category: 'home', timeOfDay: 'daytime', minutes: 2 }],
  [/gua sha|massage/i, { title: '1-min face massage while you moisturize', emoji: '💆‍♀️', category: 'selfcare', timeOfDay: 'evening', minutes: 1 }],
  [/hair wash|keratin|hair oil/i, { title: 'Quick scalp massage & silk scrunchie', emoji: '💇‍♀️', category: 'selfcare', timeOfDay: 'evening', minutes: 2 }],
  [/shower/i, { title: '5-min warm shower reset', emoji: '🚿', category: 'selfcare', timeOfDay: 'evening', minutes: 5 }],
  [/inbox|work task|email/i, { title: '2-min inbox triage: star 3, archive the rest', emoji: '📥', category: 'studies', timeOfDay: 'daytime', minutes: 2 }],
  [/stretch/i, { title: '3-min floor stretch before bed', emoji: '🤸‍♀️', category: 'movement', timeOfDay: 'evening', minutes: 3 }],
  [/10k|steps|walk/i, { title: '10-min fresh-air walk', emoji: '👟', category: 'movement', timeOfDay: 'daytime', minutes: 10, sport: 'walk' }],
];

/** Booked & Busy: anything long becomes a 5-minute between-meetings version. */
const onTheGo: [RegExp, Template][] = [
  [/lecture|review|notes/i, { title: '5-min lecture skim between classes', emoji: '🎧', category: 'studies', timeOfDay: 'daytime', minutes: 5 }],
  [/flashcard|exam prep/i, { title: 'Flashcards in line or on the bus', emoji: '🗂️', category: 'studies', timeOfDay: 'daytime', minutes: 5 }],
  [/read/i, { title: 'Read 2 pages on your commute', emoji: '📖', category: 'studies', timeOfDay: 'daytime', minutes: 5 }],
];

const chefMode: Template = { title: 'Chef mode: cook something new from scratch', emoji: '👩‍🍳', category: 'home', timeOfDay: 'evening', wins: 2, minutes: 60 };
const quickMeal: Template = { title: 'Quick 20-min meal & 10-min tidy', emoji: '🍝', category: 'home', timeOfDay: 'evening', minutes: 30 };

const sportKits: Record<MovementPick, (time: string | null, low: boolean) => Template[]> = {
  tennis: (time) => [
    { title: 'Pack tennis bag & water bottle', emoji: '🎒', category: 'movement', timeOfDay: 'daytime', minutes: 3 },
    { title: `Tennis session / practice${time ? ` at ${time}` : ''}`, emoji: '🎾', category: 'movement', timeOfDay: 'daytime', wins: 2, minutes: 60, sport: 'tennis' },
    { title: 'Post-match 5-min calf & shoulder stretch', emoji: '🤸‍♀️', category: 'movement', timeOfDay: 'evening', minutes: 5 },
  ],
  pilates: (time, low) => [
    { title: 'Pack grip socks & water bottle', emoji: '🧦', category: 'movement', timeOfDay: 'daytime', minutes: 2 },
    { title: `${low ? 'Gentle mat Pilates' : 'Pilates class'}${time ? ` at ${time}` : ''}`, emoji: '🧘‍♀️', category: 'movement', timeOfDay: 'daytime', wins: 2, minutes: low ? 20 : 50, sport: 'pilates' },
    { title: 'Post-class 5-min hip flexor release', emoji: '🌸', category: 'movement', timeOfDay: 'evening', minutes: 5 },
  ],
  gym: (time) => [
    { title: 'Pack gym bag & pre-workout snack', emoji: '🎒', category: 'movement', timeOfDay: 'morning', minutes: 3 },
    { title: `Gym session${time ? ` at ${time}` : ''}`, emoji: '🏋️‍♀️', category: 'movement', timeOfDay: 'daytime', wins: 2, minutes: 60, sport: 'gym' },
    { title: 'Cool-down stretch & protein', emoji: '🥤', category: 'movement', timeOfDay: 'daytime', minutes: 5 },
  ],
  run: (time, low) => [
    { title: 'Lace up & pick a playlist', emoji: '🎧', category: 'movement', timeOfDay: 'daytime', minutes: 2 },
    {
      title: `${low ? 'Easy hot girl walk' : 'Run or hot girl walk'}${time ? ` at ${time}` : ''}`,
      emoji: low ? '👟' : '🏃‍♀️',
      category: 'movement',
      timeOfDay: 'daytime',
      wins: 2,
      minutes: low ? 25 : 40,
      sport: low ? 'walk' : 'running',
    },
    { title: '5-min calf & hamstring stretch', emoji: '🦵', category: 'movement', timeOfDay: 'evening', minutes: 5 },
  ],
  rest: () => [
    { title: 'Gentle 10-min mobility flow', emoji: '🍵', category: 'movement', timeOfDay: 'morning', minutes: 10 },
    { title: 'Slow fresh-air stroll', emoji: '🌿', category: 'movement', timeOfDay: 'daytime', minutes: 15, sport: 'walk' },
    { title: 'Legs up the wall for 5 min', emoji: '🛋️', category: 'movement', timeOfDay: 'evening', minutes: 5 },
  ],
};

const presetExtras: Record<DayPresetId, Template[]> = {
  exam: [
    { title: 'Phone in another room for sprint 1', emoji: '📵', category: 'studies', timeOfDay: 'daytime', minutes: 1 },
    { title: 'Brain break: 5-min walk outside', emoji: '🌤️', category: 'movement', timeOfDay: 'daytime', minutes: 5 },
    { title: 'Snack & hydrate between sprints', emoji: '🍎', category: 'home', timeOfDay: 'daytime', minutes: 2 },
  ],
  thatgirl: [
    { title: 'Cold water face splash & affirmation', emoji: '💦', category: 'selfcare', timeOfDay: 'morning', minutes: 1 },
    { title: 'Plan tomorrow’s outfit & bag', emoji: '👗', category: 'home', timeOfDay: 'evening', minutes: 5 },
    { title: 'Gratitude journal: 3 lines', emoji: '📓', category: 'selfcare', timeOfDay: 'evening', minutes: 3 },
    { title: '20-min home reset playlist', emoji: '🎶', category: 'home', timeOfDay: 'evening', minutes: 20 },
  ],
  cozy: [
    { title: 'Warm tea & cozy blanket moment', emoji: '☕', category: 'selfcare', timeOfDay: 'daytime', minutes: 5 },
    { title: 'Heating pad & one comfort episode', emoji: '🧸', category: 'selfcare', timeOfDay: 'evening', minutes: 30 },
    { title: 'Early wind-down: lights low by 10pm', emoji: '🕯️', category: 'selfcare', timeOfDay: 'evening', minutes: 2 },
  ],
  busy: [
    { title: 'Pack snacks & water for the day', emoji: '🥜', category: 'home', timeOfDay: 'morning', minutes: 3 },
    { title: 'Quick meal: grab-and-go protein box', emoji: '🥡', category: 'home', timeOfDay: 'daytime', minutes: 5 },
    { title: '3 deep breaths between meetings', emoji: '🌬️', category: 'selfcare', timeOfDay: 'daytime', minutes: 1 },
  ],
};

const fillers: Template[] = [
  { title: 'Drink 5 big sips of water', emoji: '💧', category: 'morning', timeOfDay: 'daytime', minutes: 1 },
  { title: 'Put 3 stray items back in their place', emoji: '🧺', category: 'home', timeOfDay: 'evening', minutes: 2 },
  { title: 'Apply lip balm & take 3 deep breaths', emoji: '💋', category: 'selfcare', timeOfDay: 'daytime', minutes: 1 },
  { title: 'Step outside for 2 minutes of daylight', emoji: '☀️', category: 'morning', timeOfDay: 'morning', minutes: 2 },
  { title: 'Text someone you love a 💛', emoji: '💌', category: 'selfcare', timeOfDay: 'evening', minutes: 1 },
  { title: 'Write tomorrow’s #1 task on a sticky note', emoji: '📝', category: 'studies', timeOfDay: 'evening', minutes: 1 },
  { title: '10 slow neck rolls', emoji: '🙆‍♀️', category: 'movement', timeOfDay: 'daytime', minutes: 1 },
  { title: 'Wipe the bathroom sink', emoji: '🫧', category: 'home', timeOfDay: 'evening', minutes: 2 },
];

const isStudyBlock = (t: Task) => t.category === 'studies' && /stud|lecture|flashcard|exam|revision|review|read/i.test(t.title);
const timeIdx = (t: Pick<Task, 'timeOfDay'>) => timeOfDayOrder.indexOf(t.timeOfDay);

function fromTemplate(tpl: Template, tier: TaskTier, note: string): Task {
  return {
    id: uid('ai'),
    title: tpl.title,
    emoji: tpl.emoji,
    category: tpl.category,
    timeOfDay: tpl.timeOfDay,
    tier,
    days: ALL_DAYS,
    order: 0,
    custom: false,
    wins: tpl.wins ?? 1,
    minutes: tpl.minutes,
    sport: tpl.sport,
    remixNote: note,
  };
}

export interface PlannerContext {
  tasks: Task[];
  doneIds: Set<string>;
  subject: string;
  /** Wins available from the AM/PM shelves that will be visible in the resulting mode. */
  shelfWins: (mode: EnergyMode) => number;
}

const taskWins = (t: Task) => t.wins ?? 1;

function finalize(out: Task[], mode: EnergyMode, ctx: PlannerContext, changes: string[]): Task[] {
  const seen = new Set<string>();
  const unique = out.filter((t) => {
    const key = t.title.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const target = energyMeta[mode].target;
  const cap = tierCap[mode];
  let available = unique.reduce((a, t) => a + taskWins(t), 0) + ctx.shelfWins(mode);
  let added = 0;
  for (const f of fillers) {
    if (available >= target + 2) break;
    if (seen.has(f.title.toLowerCase())) continue;
    unique.push(fromTemplate(f, cap, '✨ Instant micro-win'));
    seen.add(f.title.toLowerCase());
    available++;
    added++;
  }
  if (added) changes.push(`Topped up with ${added} instant micro-win${added === 1 ? '' : 's'} so ${target} is reachable`);
  return unique
    .map((t) => (ctx.doneIds.has(t.id) ? t : { ...t, tier: Math.min(t.tier, cap) as TaskTier }))
    .sort((a, b) => timeIdx(a) - timeIdx(b) || a.order - b.order)
    .map((t, i) => ({ ...t, order: i }));
}

// ─── Smart Rules engine ─────────────────────────────────────────────────────────────────────────

export function generateRulesPlan(input: RemixInput, ctx: PlannerContext): RemixResult {
  const r = resolveInput(input);
  const { parsed, mode } = r;
  const cap = tierCap[mode];
  const out: Task[] = [];
  const changes: string[] = [];
  let compressed = 0;
  let parked = 0;
  let sportSwapped = 0;
  let studyReplaced = 0;
  let order = 0;

  const compressHome = r.cozy || r.exam || r.homeTime === 10 || parsed.skipCleaning;
  const studyChunk = r.exam || parsed.studyHours !== null;
  const sorted = [...ctx.tasks].sort((a, b) => a.order - b.order);

  for (const t of sorted) {
    order = t.order;
    if (ctx.doneIds.has(t.id)) {
      out.push(t);
      continue;
    }
    if (t.category === 'movement' && t.sport && t.sport !== 'walk') {
      sportSwapped++;
      continue;
    }
    if (t.category === 'movement' && t.sport === 'walk' && r.movement === 'run') {
      sportSwapped++;
      continue;
    }
    if (studyChunk && isStudyBlock(t)) {
      studyReplaced++;
      continue;
    }

    let next: Task = t;
    const scale = (table: [RegExp, Template][]) => {
      const hit = table.find(([re]) => re.test(t.title));
      if (!hit) return false;
      const tpl = hit[1];
      next = { ...t, title: tpl.title, emoji: tpl.emoji, minutes: tpl.minutes, wins: 1, remixNote: `✨ Compressed from “${t.title}”` };
      compressed++;
      return true;
    };

    const isCook = /cook|dinner|meal/i.test(t.title);
    if (t.category === 'home' && isCook && r.homeTime === 60 && !r.cozy) {
      next = { ...t, title: chefMode.title, emoji: chefMode.emoji, wins: 2, minutes: 60, remixNote: `✨ Chef Mode upgrade of “${t.title}”` };
    } else if (t.category === 'home' && isCook && r.homeTime === 30 && !r.cozy) {
      next = { ...t, title: quickMeal.title, emoji: quickMeal.emoji, minutes: 30, remixNote: `✨ Quick Meal & Tidy version` };
    } else if ((compressHome && t.category === 'home') || (r.cozy && t.tier >= 2)) {
      if (!scale(compressions) && r.cozy && t.tier >= 2) {
        parked++;
        continue;
      }
    } else if (r.busy && !scale(onTheGo) && !t.minutes && t.tier === 3) {
      parked++;
      continue;
    } else if (r.exam && /inbox|work task|email/i.test(t.title)) {
      scale(compressions);
    }

    if (mode === 'soft' && next.tier === 3 && !next.remixNote) {
      parked++;
      continue;
    }
    out.push(next);
  }

  if (studyChunk) {
    const hours = parsed.studyHours ?? (r.preset === 'exam' ? 3 : 1.5);
    const sprints = Math.max(1, Math.min(8, Math.round((hours * 60) / 45)));
    for (let i = 1; i <= sprints; i++) {
      out.push({
        ...fromTemplate({ title: `Study sprint ${i}/${sprints} · 45 min ${ctx.subject}`, emoji: '📚', category: 'studies', timeOfDay: 'daytime', minutes: 45 }, i === 1 ? 1 : cap, `✨ Sprint ${i} of ${sprints}`),
        order: order + i * 2,
      });
      if (i < sprints)
        out.push({
          ...fromTemplate({ title: `5-min posture stretch & hydrate (${i})`, emoji: '🧘‍♀️', category: 'movement', timeOfDay: 'daytime', minutes: 5 }, cap, '✨ Brain break'),
          order: order + i * 2 + 1,
        });
    }
    changes.push(
      `Chunked ${parsed.studyHours ? `${hours}h of study` : 'study'} into ${sprints} × 45-min sprints${sprints > 1 ? ` with ${sprints - 1} stretch & hydrate breaks` : ''}${studyReplaced ? ` (replaced ${studyReplaced} big study task${studyReplaced === 1 ? '' : 's'})` : ''}`,
    );
    if (parsed.examTomorrow) out.push(fromTemplate({ title: 'Pack exam bag: pens, ID, water, snack', emoji: '🎒', category: 'studies', timeOfDay: 'evening', minutes: 3 }, 1, '✨ Exam tomorrow'));
  }

  const kit = sportKits[r.movement](parsed.movementTime, r.battery === 'low').map((tpl) => fromTemplate(tpl, cap, r.movement === 'rest' ? '✨ Rest day swap' : '✨ Sport-specific win'));
  out.push(...kit);
  const kitName = movementOptions.find((m) => m.value === r.movement)!;
  changes.push(
    r.movement === 'rest'
      ? `Rest day: swapped ${sportSwapped || 'any'} workout${sportSwapped === 1 ? '' : 's'} for gentle mobility`
      : `${kitName.emoji} ${kitName.label} day: added pack-the-bag, the session (+2) and a recovery stretch${parsed.movementTime ? ` at ${parsed.movementTime}` : ''}`,
  );

  if (r.preset) out.push(...presetExtras[r.preset].map((tpl) => fromTemplate(tpl, cap, `✨ ${dayPresets[r.preset!].emoji} ${dayPresets[r.preset!].label.split(' (')[0].split(' /')[0]}`)));
  if (compressed) changes.push(`Compressed ${compressed} high-friction task${compressed === 1 ? '' : 's'} into 2–10 min micro-wins`);
  if (parked) changes.push(`Parked ${parked} optional task${parked === 1 ? '' : 's'} for a higher-energy day`);
  if (r.homeTime === 60 && !r.cozy) changes.push('Chef Mode: dinner upgraded to a from-scratch cook (+2)');

  const tasks = finalize(out, mode, ctx, changes);
  const label = r.preset ? dayPresets[r.preset].label : 'Custom';
  const planned = tasks.reduce((a, t) => a + taskWins(t), 0) + ctx.shelfWins(mode);
  return {
    tasks,
    energyMode: mode,
    summary: `${r.preset ? dayPresets[r.preset].emoji : '✨'} ${label} remix: ${planned} wins planned for a ${energyMeta[mode].short} day (target ${energyMeta[mode].target}).`,
    changes,
    engine: 'rules',
  };
}

// ─── Split into 3 micro-wins ────────────────────────────────────────────────────────────────────

const splitRecipes: [RegExp, [string, string][]][] = [
  [/lecture|slides|review|notes/i, [['💻', 'Open laptop & clear desk space'], ['🖍️', 'Read & highlight the first 10 slides'], ['📝', 'Write 3 bullet summary points']]],
  [/stud|exam|revis|flashcard|sprint/i, [['📚', 'Open your notes to the right page'], ['⏱️', 'Do one focused 5-min chunk'], ['✅', 'Quiz yourself on 3 questions']]],
  [/kitchen|dish|sink/i, [['🧴', 'Clear everything off one counter'], ['🍽️', 'Load or wash 5 dishes'], ['🧽', 'Wipe the counter & sink']]],
  [/cook|dinner|meal|bowl/i, [['🥕', 'Pull out 3 ingredients'], ['🔪', 'Chop & start one thing cooking'], ['🥗', 'Plate it pretty & sit down']]],
  [/laundry/i, [['🧺', 'Gather clothes into the basket'], ['🫧', 'Start the machine'], ['👕', 'Fold just 5 items']]],
  [/room|reset|clean|tidy|desk/i, [['🧺', 'Put 5 things back where they live'], ['🗑️', 'Take out one bag of trash'], ['🕯️', 'Wipe one surface & light a candle']]],
  [/sheet|bed/i, [['🛏️', 'Strip the bed'], ['🧺', 'Grab fresh sheets'], ['✨', 'Put the fitted sheet on & fluff pillows']]],
  [/inbox|email|work/i, [['📥', 'Open the inbox & star 3 emails'], ['✍️', 'Reply to the easiest one'], ['🗂️', 'Archive 10 old emails']]],
  [/tennis|pilates|gym|run|walk|workout|class/i, [['🎒', 'Put on your workout fit'], ['🧃', 'Fill your water bottle & pack the bag'], ['🚪', 'Walk out the door & warm up 5 min']]],
  [/hair|skin|gua sha|shower|mask/i, [['🧴', 'Set out your products'], ['🎶', 'Put on a feel-good song'], ['💆‍♀️', 'Do the first step, slowly']]],
];

export function splitIntoMicroWins(task: Task): Task[] {
  const recipe = splitRecipes.find(([re]) => re.test(task.title))?.[1] ?? [
    ['⏲️', 'Set a 5-min timer & gather what you need'],
    ['🪄', `Do the first tiny piece of “${task.title}”`],
    ['🎉', 'Finish one more piece & celebrate'],
  ];
  return recipe.map(([emoji, title], i) => ({
    ...task,
    id: uid('split'),
    title,
    emoji,
    wins: 1,
    minutes: 5,
    order: task.order + i * 0.01,
    splitFrom: task.title,
    step: i + 1,
    remixNote: `✨ Step ${i + 1}/3 of “${task.title}”`,
  }));
}

// ─── Quick Win roulette ─────────────────────────────────────────────────────────────────────────

export interface QuickWinCandidate {
  key: string;
  title: string;
  emoji: string;
  category: CategoryId;
  taskId?: string;
}

export const instantMicroWins: QuickWinCandidate[] = [
  { key: 'iw-sips', title: 'Drink 5 big sips of water right now', emoji: '💧', category: 'morning' },
  { key: 'iw-balm', title: 'Apply lip balm & take 3 deep breaths', emoji: '💋', category: 'selfcare' },
  { key: 'iw-stray', title: 'Put 3 stray items back in their place', emoji: '🧺', category: 'home' },
  { key: 'iw-window', title: 'Open a window & breathe fresh air for 30s', emoji: '🪟', category: 'morning' },
  { key: 'iw-calf', title: 'Stand up & do 10 calf raises', emoji: '🦵', category: 'movement' },
  { key: 'iw-desk', title: 'Wipe your desk in one sweep', emoji: '🧽', category: 'home' },
  { key: 'iw-text', title: 'Text someone you love a 💛', emoji: '💌', category: 'selfcare' },
  { key: 'iw-note', title: 'Write tomorrow’s #1 task on a sticky note', emoji: '📝', category: 'studies' },
  { key: 'iw-neck', title: 'Do 10 slow neck rolls', emoji: '🙆‍♀️', category: 'movement' },
];

export function rouletteCandidates(activeTasks: Task[], doneIds: Set<string>, rand = Math.random): QuickWinCandidate[] {
  const fromList = activeTasks
    .filter((t) => !doneIds.has(t.id) && (t.minutes ?? 99) <= 2)
    .map((t) => ({ key: t.id, title: t.title, emoji: t.emoji, category: t.category, taskId: t.id }));
  const instant = [...instantMicroWins].sort(() => rand() - 0.5).slice(0, Math.max(3, 6 - fromList.length));
  return [...fromList, ...instant].sort(() => rand() - 0.5);
}

// ─── Live LLM path ──────────────────────────────────────────────────────────────────────────────

const categories: CategoryId[] = ['morning', 'studies', 'movement', 'selfcare', 'home'];
const times: TimeOfDay[] = ['morning', 'daytime', 'evening'];
const modes: EnergyMode[] = ['high', 'balanced', 'soft'];

export const planJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'energyMode', 'changes', 'tasks'],
  properties: {
    summary: { type: 'string' },
    energyMode: { type: 'string', enum: modes },
    changes: { type: 'array', items: { type: 'string' } },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['keepId', 'title', 'emoji', 'category', 'timeOfDay', 'wins', 'minutes', 'note'],
        properties: {
          keepId: { type: 'string', description: 'id of an existing task kept as-is, or empty string for a new task' },
          title: { type: 'string' },
          emoji: { type: 'string' },
          category: { type: 'string', enum: categories },
          timeOfDay: { type: 'string', enum: times },
          wins: { type: 'integer', enum: [1, 2] },
          minutes: { type: 'integer' },
          note: { type: 'string' },
        },
      },
    },
  },
} as const;

const geminiSchema = {
  type: 'OBJECT',
  required: ['summary', 'energyMode', 'changes', 'tasks'],
  properties: {
    summary: { type: 'STRING' },
    energyMode: { type: 'STRING', enum: modes },
    changes: { type: 'ARRAY', items: { type: 'STRING' } },
    tasks: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['keepId', 'title', 'emoji', 'category', 'timeOfDay', 'wins', 'minutes', 'note'],
        properties: {
          keepId: { type: 'STRING' },
          title: { type: 'STRING' },
          emoji: { type: 'STRING' },
          category: { type: 'STRING', enum: categories },
          timeOfDay: { type: 'STRING', enum: times },
          wins: { type: 'INTEGER' },
          minutes: { type: 'INTEGER' },
          note: { type: 'STRING' },
        },
      },
    },
  },
};

const SYSTEM_PROMPT = `You are the GlowUp Daily concierge. Rebuild the user's checklist for TODAY so they comfortably hit their daily win target without burnout.
Rules:
1. Friction scaling: on low energy or exam days turn high-friction chores into 2-10 minute micro-wins.
2. Study chunking: split long study/work into 45-minute sprint tasks with "5-min posture stretch & hydrate" breaks between them.
3. Sport injection: for the chosen sport add "pack the bag" (+1), the session itself (wins 2) and a recovery stretch (+1). Rest day means gentle mobility.
4. Keep every task marked done:true by returning its keepId unchanged. Reuse keepId for any other task you keep unchanged.
5. Return 10-28 tasks. Warm, short, motivating titles under 60 characters with one emoji each.
Return only JSON matching the schema.`;

interface LLMTask {
  keepId: string;
  title: string;
  emoji: string;
  category: CategoryId;
  timeOfDay: TimeOfDay;
  wins: number;
  minutes: number;
  note: string;
}
interface LLMPlan {
  summary: string;
  energyMode: EnergyMode;
  changes: string[];
  tasks: LLMTask[];
}

export class PlannerError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

export function validateLLMPlan(value: unknown): LLMPlan {
  const bad = (why: string): never => {
    throw new PlannerError(`Unexpected AI response (${why})`);
  };
  if (!value || typeof value !== 'object') bad('not an object');
  const v = value as Record<string, unknown>;
  if (typeof v.summary !== 'string') bad('summary');
  if (!modes.includes(v.energyMode as EnergyMode)) bad('energyMode');
  if (!Array.isArray(v.tasks) || v.tasks.length < 4 || v.tasks.length > 40) bad('task count');
  const changes = Array.isArray(v.changes) ? v.changes.filter((c): c is string => typeof c === 'string').slice(0, 8) : [];
  const tasks = (v.tasks as unknown[]).map((raw) => {
    const t = raw as Record<string, unknown>;
    if (!t || typeof t.title !== 'string' || !t.title.trim()) bad('task title');
    if (!categories.includes(t.category as CategoryId)) bad('task category');
    if (!times.includes(t.timeOfDay as TimeOfDay)) bad('task timeOfDay');
    return {
      keepId: typeof t.keepId === 'string' ? t.keepId : '',
      title: (t.title as string).trim().slice(0, 80),
      emoji: typeof t.emoji === 'string' && t.emoji.trim() ? [...t.emoji.trim()].slice(0, 4).join('') : '✨',
      category: t.category as CategoryId,
      timeOfDay: t.timeOfDay as TimeOfDay,
      wins: t.wins === 2 ? 2 : 1,
      minutes: typeof t.minutes === 'number' && Number.isFinite(t.minutes) ? Math.max(1, Math.min(240, Math.round(t.minutes))) : 5,
      note: typeof t.note === 'string' ? t.note.slice(0, 80) : '',
    };
  });
  return { summary: (v.summary as string).slice(0, 240), energyMode: v.energyMode as EnergyMode, changes, tasks };
}

function buildUserMessage(input: RemixInput, ctx: PlannerContext) {
  const r = resolveInput(input);
  return JSON.stringify({
    preset: r.preset ? dayPresets[r.preset].label : null,
    battery: r.battery,
    movement: r.movement,
    homeMinutes: r.homeTime,
    note: input.prompt,
    parsedSignals: r.parsed,
    suggestedEnergyMode: r.mode,
    targetWins: energyMeta[r.mode].target,
    shelfWinsAlreadyAvailable: ctx.shelfWins(r.mode),
    studySubject: ctx.subject,
    currentTasks: ctx.tasks.map((t) => ({ id: t.id, title: t.title, category: t.category, timeOfDay: t.timeOfDay, wins: taskWins(t), done: ctx.doneIds.has(t.id) })),
  });
}

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

async function requestJSON(fetchImpl: FetchLike, url: string, init: RequestInit, timeoutMs: number): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (e) {
    const aborted = (e as Error)?.name === 'AbortError';
    throw new PlannerError(aborted ? 'AI request timed out' : 'Offline or AI service unreachable');
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 401 || res.status === 403) throw new PlannerError('API key was rejected');
  if (res.status === 429) throw new PlannerError('AI rate limit or quota reached');
  if (!res.ok) throw new PlannerError(`AI service error ${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new PlannerError('Unexpected AI response (not JSON)');
  }
}

function parseContent(text: unknown): unknown {
  if (typeof text !== 'string') throw new PlannerError('Unexpected AI response (empty)');
  try {
    return JSON.parse(text);
  } catch {
    throw new PlannerError('Unexpected AI response (invalid JSON)');
  }
}

export async function callLLM(
  provider: 'openai' | 'gemini',
  model: string,
  apiKey: string,
  input: RemixInput,
  ctx: PlannerContext,
  fetchImpl: FetchLike = fetch,
  timeoutMs = 20_000,
): Promise<LLMPlan> {
  const user = buildUserMessage(input, ctx);
  if (provider === 'openai') {
    const data = (await requestJSON(
      fetchImpl,
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: user },
          ],
          response_format: { type: 'json_schema', json_schema: { name: 'glowup_day_plan', strict: true, schema: planJsonSchema } },
        }),
      },
      timeoutMs,
    )) as { choices?: { message?: { content?: string; refusal?: string | null } }[] };
    const msg = data?.choices?.[0]?.message;
    if (msg?.refusal) throw new PlannerError('AI declined the request');
    return validateLLMPlan(parseContent(msg?.content));
  }
  const data = (await requestJSON(
    fetchImpl,
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { temperature: 0.7, responseMimeType: 'application/json', responseSchema: geminiSchema },
      }),
    },
    timeoutMs,
  )) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  return validateLLMPlan(parseContent(data?.candidates?.[0]?.content?.parts?.[0]?.text));
}

/** Turns a validated LLM plan into tasks, keeping ids (and therefore completion) of kept/done tasks. */
export function mergeLLMPlan(plan: LLMPlan, input: RemixInput, ctx: PlannerContext, engine: PlannerEngine): RemixResult {
  const mode = plan.energyMode;
  const cap = tierCap[mode];
  const byId = new Map(ctx.tasks.map((t) => [t.id, t]));
  const used = new Set<string>();
  const out: Task[] = [];
  plan.tasks.forEach((lt, i) => {
    const existing = lt.keepId ? byId.get(lt.keepId) : undefined;
    if (existing && !used.has(existing.id)) {
      used.add(existing.id);
      out.push(ctx.doneIds.has(existing.id) ? existing : { ...existing, title: lt.title, emoji: lt.emoji, order: i, wins: lt.wins, minutes: lt.minutes, remixNote: lt.note ? `✨ ${lt.note}` : existing.remixNote });
      return;
    }
    out.push({ ...fromTemplate({ title: lt.title, emoji: lt.emoji, category: lt.category, timeOfDay: lt.timeOfDay, wins: lt.wins, minutes: lt.minutes }, cap, lt.note ? `✨ ${lt.note}` : '✨ AI pick'), order: i });
  });
  for (const t of ctx.tasks) if (ctx.doneIds.has(t.id) && !used.has(t.id)) out.push(t);
  const changes = [...plan.changes];
  const tasks = finalize(out, mode, ctx, changes);
  return { tasks, energyMode: mode, summary: plan.summary, changes, engine };
}

/**
 * Hybrid entry point. Smart Rules run when no provider/key is configured; otherwise the LLM is tried
 * and any failure (offline, bad key, timeout, malformed JSON) silently falls back to Smart Rules.
 */
export async function planDay(
  input: RemixInput,
  ctx: PlannerContext,
  settings: Pick<AISettings, 'provider' | 'model'>,
  apiKey: string | null,
  fetchImpl?: FetchLike,
): Promise<RemixResult> {
  if (settings.provider === 'off' || !apiKey) return generateRulesPlan(input, ctx);
  try {
    const plan = await callLLM(settings.provider, settings.model || DEFAULT_MODELS[settings.provider], apiKey, input, ctx, fetchImpl);
    return mergeLLMPlan(plan, input, ctx, settings.provider);
  } catch (e) {
    const reason = e instanceof PlannerError ? e.reason : 'AI request failed';
    return { ...generateRulesPlan(input, ctx), fallbackReason: reason };
  }
}
