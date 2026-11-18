import { ALL_DAYS } from '../lib/date';
import type { CategoryId, RoutineId, SportId, TaskTier, TimeOfDay, Weekday } from '../types';

/** Library of ideas shown as tappable options whenever the user creates something. Nothing here is saved until picked. */

export interface TaskSuggestion {
  title: string;
  emoji: string;
  category: CategoryId;
  timeOfDay: TimeOfDay;
  tier: TaskTier;
  days: Weekday[];
  sport?: SportId;
  minutes?: number;
}

const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5];

const t = (
  category: CategoryId,
  emoji: string,
  title: string,
  timeOfDay: TimeOfDay,
  tier: TaskTier = 2,
  extra: Partial<TaskSuggestion> = {},
): TaskSuggestion => ({ title, emoji, category, timeOfDay, tier, days: ALL_DAYS, ...extra });

export const taskSuggestions: TaskSuggestion[] = [
  t('morning', '🛏️', 'Make the bed', 'morning', 1, { minutes: 2 }),
  t('morning', '💧', 'Drink a glass of water', 'morning', 1, { minutes: 1 }),
  t('morning', '🌤️', 'Open the curtains & let light in', 'morning', 2, { minutes: 1 }),
  t('morning', '💊', 'Take vitamins', 'morning', 2, { minutes: 1 }),
  t('morning', '📝', 'Plan top 3 priorities', 'morning', 2, { minutes: 3 }),
  t('morning', '🫗', 'Refill water bottle', 'daytime', 1, { minutes: 2 }),
  t('morning', '🧘‍♀️', '5-min morning stretch', 'morning', 2, { minutes: 5 }),
  t('morning', '📵', 'No phone for the first 20 minutes', 'morning', 3),
  t('morning', '☀️', 'Step outside for morning daylight', 'morning', 2, { minutes: 2 }),
  t('morning', '📓', 'Journal 3 lines', 'morning', 3, { minutes: 3 }),

  t('studies', '📚', 'Deep study block', 'daytime', 1),
  t('studies', '🎧', 'Lecture review & notes', 'daytime', 2, { days: WEEKDAYS }),
  t('studies', '🗂️', 'Exam prep flashcards', 'daytime', 2),
  t('studies', '💼', 'Work tasks & inbox zero', 'daytime', 3, { days: WEEKDAYS }),
  t('studies', '📖', 'Read 10 pages', 'evening', 3),
  t('studies', '✍️', 'Write 300 words of my thesis', 'daytime', 2, { days: WEEKDAYS }),
  t('studies', '🗣️', '15 min language practice', 'daytime', 2),
  t('studies', '📅', 'Review tomorrow’s calendar', 'evening', 2, { minutes: 2 }),
  t('studies', '🧠', 'Past paper question', 'daytime', 3),

  t('movement', '🧘‍♀️', 'Pilates reformer class', 'daytime', 3, { days: [1, 3, 5], sport: 'pilates' }),
  t('movement', '🎾', 'Tennis practice', 'daytime', 3, { days: [2, 4, 6], sport: 'tennis' }),
  t('movement', '🏋️‍♀️', 'Gym session', 'daytime', 3, { days: [1, 4], sport: 'gym' }),
  t('movement', '🏃‍♀️', 'Easy 5K run', 'daytime', 3, { days: [2, 6], sport: 'running' }),
  t('movement', '👟', '10k steps hot girl walk', 'daytime', 2, { sport: 'walk' }),
  t('movement', '🤸‍♀️', 'Evening stretching', 'evening', 2),
  t('movement', '🧘', '10-min yoga flow', 'morning', 2),
  t('movement', '🚴‍♀️', 'Bike to class', 'daytime', 3, { days: WEEKDAYS }),
  t('movement', '💃', 'Dance it out to 3 songs', 'evening', 3, { minutes: 10 }),

  t('selfcare', '🚿', 'Shower ritual', 'evening', 2),
  t('selfcare', '💆‍♀️', 'Gua Sha & face massage', 'evening', 3, { days: [0, 1, 3, 5] }),
  t('selfcare', '💇‍♀️', 'Hair wash & keratin mask', 'evening', 3, { days: [0, 3] }),
  t('selfcare', '🌸', 'Hair oil routine', 'evening', 3, { days: [2, 5] }),
  t('selfcare', '🛁', 'Bath with Epsom salts', 'evening', 3, { days: [0] }),
  t('selfcare', '💅', 'Nails & cuticle oil', 'evening', 3, { days: [6] }),
  t('selfcare', '🦷', 'Floss', 'evening', 1, { minutes: 2 }),
  t('selfcare', '🕯️', 'Screens off by 11pm', 'evening', 2),
  t('selfcare', '😴', 'In bed by 23:00', 'evening', 2),

  t('home', '☕', 'Prep lunch & iced coffee', 'morning', 2, { days: WEEKDAYS }),
  t('home', '🥗', 'Cook a nourishing dinner', 'evening', 2),
  t('home', '🍽️', 'Dishes done, sink shiny', 'evening', 3),
  t('home', '🧺', '10-minute room reset', 'evening', 2),
  t('home', '👕', 'Laundry load', 'evening', 3, { days: [0, 4] }),
  t('home', '🛌', 'Change bedsheets', 'evening', 3, { days: [0] }),
  t('home', '🪴', 'Clear your desk', 'daytime', 3, { minutes: 2 }),
  t('home', '🌿', 'Water the plants', 'morning', 2, { days: [3, 0], minutes: 2 }),
  t('home', '🛒', 'Grocery list for the week', 'evening', 2, { days: [0] }),
  t('home', '🗑️', 'Take out the trash', 'evening', 2, { minutes: 2 }),
];

export const shelfSuggestions: Record<RoutineId, { title: string; emoji: string }[]> = {
  am: [
    { title: 'Gentle cleanse', emoji: '🫧' },
    { title: 'Toner & vitamin C serum', emoji: '💧' },
    { title: 'Hyaluronic acid serum', emoji: '💦' },
    { title: 'Eye cream', emoji: '👁️' },
    { title: 'Moisturize', emoji: '🧴' },
    { title: 'SPF 50', emoji: '☀️' },
    { title: 'Lip balm', emoji: '💋' },
    { title: 'Ice roller', emoji: '🧊' },
  ],
  pm: [
    { title: 'Oil cleanse', emoji: '🫒' },
    { title: 'Second cleanse', emoji: '🫧' },
    { title: 'Exfoliating toner', emoji: '✨' },
    { title: 'Retinol or peptide serum', emoji: '🌙' },
    { title: 'Niacinamide serum', emoji: '💧' },
    { title: 'Night cream & lip mask', emoji: '🌛' },
    { title: 'Sheet mask', emoji: '🎭' },
    { title: 'Silk pillowcase & hair tie', emoji: '🎀' },
  ],
};

export interface GoalSuggestion {
  title: string;
  emoji: string;
  category: CategoryId;
  milestones: string[];
}

export const goalSuggestions: GoalSuggestion[] = [
  { title: 'Ace Finals', emoji: '🎓', category: 'studies', milestones: ['Build a 4-week revision calendar', 'Finish chapter summaries', 'Do 2 timed past papers', 'Office hours for my hardest module', 'Full mock exam week'] },
  { title: 'Finish my thesis draft', emoji: '✍️', category: 'studies', milestones: ['Lock the outline with my supervisor', 'Write the literature review', 'Draft methods & results', 'Full draft to supervisor'] },
  { title: 'Land a summer internship', emoji: '💼', category: 'studies', milestones: ['Polish CV & LinkedIn', 'Apply to 10 roles', 'Practice 3 mock interviews', 'Send thank-you notes'] },
  { title: 'Run 5K under 28 min', emoji: '🏃‍♀️', category: 'movement', milestones: ['Run 3 times a week for 2 weeks', 'Hit a 30:00 5K', 'Add one interval session weekly', 'Race day: sub-28 5K'] },
  { title: 'Level up my tennis serve', emoji: '🎾', category: 'movement', milestones: ['Film my serve & spot one fix', '100 serves practice bucket', 'Land 7/10 first serves in a match'] },
  { title: 'Pilates 3x a week for a month', emoji: '🧘‍♀️', category: 'movement', milestones: ['Book a class pack', 'Complete week 1', 'Complete week 2', 'Hold a 60s teaser'] },
  { title: 'Glass-skin glow era', emoji: '🫧', category: 'selfcare', milestones: ['Patch test a new retinol', '30 days of SPF every morning', 'Drink 2L water 5 days in a row'] },
  { title: 'Sleep 8 hours for 2 weeks', emoji: '😴', category: 'selfcare', milestones: ['Set a wind-down alarm', 'Phone charges outside the bedroom', '7 nights in a row', '14 nights in a row'] },
  { title: 'Cook 4x a week at home', emoji: '🍳', category: 'home', milestones: ['Save 10 cozy weeknight recipes', 'Sunday grocery & prep ritual', 'Batch-cook lunches for a week', 'Host a dinner for friends'] },
  { title: 'Declutter my room', emoji: '🧺', category: 'home', milestones: ['Wardrobe: donate one bag', 'Desk & drawers', 'Under the bed', 'Bathroom shelf'] },
  { title: 'Morning routine that sticks', emoji: '☀️', category: 'morning', milestones: ['Pick a fixed wake-up time', '7 mornings without snoozing', 'Add 5 minutes of movement', '21 days in a row'] },
];

export const milestoneSuggestions: Record<CategoryId, string[]> = {
  morning: ['Same wake-up time for 7 days', 'Prep the night before', 'Morning pages for a week'],
  studies: ['Make a study plan', 'Finish the first chapter', 'Ask for feedback', 'Do a timed practice run', 'Review weak topics'],
  movement: ['Book the first session', 'Train 3 times this week', 'Film my form', 'Hit a new personal best'],
  selfcare: ['Buy what I need', '7 days in a row', '30 days in a row', 'Take a progress photo'],
  home: ['Make a list', 'Do the first 15 minutes', 'Finish one room', 'Set a weekly reset day'],
};

export const subjectSuggestions = [
  'Organic Chemistry',
  'Statistics',
  'Biology',
  'Economics',
  'Marketing',
  'Law',
  'Programming',
  'Thesis',
  'French',
  'Spanish',
  'Internship',
  'Side project',
  'Reading',
];

export const movementNoteSuggestions: Record<SportId, string[]> = {
  pilates: ['Core reformer class', 'Shaking by the end, loved it', 'Long and strong flow', 'Mat class at home'],
  tennis: ['Backhand felt amazing today', 'Rallied for 20 mins straight', 'Worked on toss consistency', 'Won a set!'],
  running: ['Negative splits!', 'Easy pace, podcast vibes', 'Ran by the sea', 'Intervals done'],
  gym: ['Hip thrust PR', 'Upper body + core', 'Glute day, felt powerful', 'New squat PR'],
  walk: ['Sunset walk with a matcha', 'Called mom on the walk', 'Phone-free walk', 'Walked to class'],
};

const norm = (s: string) => s.trim().toLowerCase();

/** Case-insensitive "contains" filter that also hides anything the user already has. */
export function filterSuggestions<T>(items: T[], query: string, existing: string[], label: (item: T) => string, limit = 8): T[] {
  const q = norm(query);
  const have = new Set(existing.map(norm));
  return items.filter((i) => !have.has(norm(label(i))) && (!q || norm(label(i)).includes(q))).slice(0, limit);
}
