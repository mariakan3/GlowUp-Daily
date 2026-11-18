import type { CategoryId, EnergyMode, SportId, TimeOfDay } from './types';

export const colors = {
  oat: '#FAF7F2',
  card: '#FFFFFF',
  cardSoft: '#F3EEE6',
  espresso: '#2C221E',
  espressoSoft: '#6B5B53',
  muted: '#A39589',
  line: '#EAE3D9',
  matcha: '#8FA882',
  matchaDeep: '#6E8A61',
  matchaTint: '#E5EDE0',
  peach: '#F4A28C',
  peachTint: '#FCE6DF',
  lilac: '#C8B6E2',
  lilacTint: '#EEE8F6',
  butter: '#F9E076',
  butterTint: '#FDF5D2',
  sky: '#A8C8E0',
  skyTint: '#E3EEF6',
  danger: '#D9725B',
};

export const radius = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const shadow = {
  shadowColor: '#2C221E',
  shadowOpacity: 0.06,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
};

export const categoryMeta: Record<
  CategoryId,
  { label: string; short: string; emoji: string; color: string; tint: string }
> = {
  morning: { label: 'Morning Reset', short: 'Morning', emoji: '☀️', color: colors.butter, tint: colors.butterTint },
  studies: { label: 'Studies & Career', short: 'Studies', emoji: '📚', color: colors.lilac, tint: colors.lilacTint },
  movement: { label: 'Movement Club', short: 'Movement', emoji: '🎾', color: colors.matcha, tint: colors.matchaTint },
  selfcare: { label: 'Skincare & Self-Care', short: 'Self-Care', emoji: '🫧', color: colors.peach, tint: colors.peachTint },
  home: { label: 'Home & Cooking', short: 'Home', emoji: '🏡', color: colors.sky, tint: colors.skyTint },
};

export const categoryOrder: CategoryId[] = ['morning', 'studies', 'movement', 'selfcare', 'home'];

export const timeOfDayMeta: Record<TimeOfDay, { label: string; emoji: string; hint: string }> = {
  morning: { label: 'Morning Reset', emoji: '☀️', hint: 'Wake up, glow up' },
  daytime: { label: 'Daytime Focus & Movement', emoji: '⚡', hint: 'Deep work and sweat' },
  evening: { label: 'Evening Sanctuary', emoji: '🌙', hint: 'Soft landing' },
};

export const timeOfDayOrder: TimeOfDay[] = ['morning', 'daytime', 'evening'];

export const energyMeta: Record<
  EnergyMode,
  { label: string; short: string; emoji: string; target: number; blurb: string; color: string; tint: string }
> = {
  high: {
    label: 'High Era',
    short: 'High Era',
    emoji: '🚀',
    target: 20,
    blurb: 'Full schedule. You are booked, busy and glowing.',
    color: colors.peach,
    tint: colors.peachTint,
  },
  balanced: {
    label: 'Balanced Day',
    short: 'Balanced',
    emoji: '🌿',
    target: 15,
    blurb: 'Your standard routine. Steady wins, no burnout.',
    color: colors.matcha,
    tint: colors.matchaTint,
  },
  soft: {
    label: 'Soft / Exam Survival',
    short: 'Soft Day',
    emoji: '🧸',
    target: 7,
    blurb: 'Only the essentials. Your streak is protected.',
    color: colors.lilac,
    tint: colors.lilacTint,
  },
};

export const energyOrder: EnergyMode[] = ['high', 'balanced', 'soft'];

export const sportMeta: Record<SportId, { label: string; emoji: string; color: string; tint: string }> = {
  pilates: { label: 'Pilates', emoji: '🧘‍♀️', color: colors.lilac, tint: colors.lilacTint },
  tennis: { label: 'Tennis', emoji: '🎾', color: colors.butter, tint: colors.butterTint },
  running: { label: 'Running', emoji: '🏃‍♀️', color: colors.peach, tint: colors.peachTint },
  gym: { label: 'Gym', emoji: '🏋️‍♀️', color: colors.sky, tint: colors.skyTint },
  walk: { label: 'Hot Girl Walk', emoji: '👟', color: colors.matcha, tint: colors.matchaTint },
};

export const sportOrder: SportId[] = ['pilates', 'tennis', 'running', 'gym', 'walk'];

export interface AuraLevel {
  name: string;
  color: string;
  glow: string;
  min: number;
}

export const auraLevels: AuraLevel[] = [
  { name: 'Ready to Glow', color: colors.line, glow: colors.cardSoft, min: 0 },
  { name: 'Spark', color: colors.butter, glow: colors.butterTint, min: 1 },
  { name: 'Momentum', color: colors.peach, glow: colors.peachTint, min: 6 },
  { name: 'Magnetic', color: colors.lilac, glow: colors.lilacTint, min: 13 },
  { name: 'Unstoppable Queen', color: colors.matcha, glow: colors.matchaTint, min: 20 },
];

export function auraFor(wins: number): AuraLevel {
  let level = auraLevels[0];
  for (const l of auraLevels) if (wins >= l.min) level = l;
  return level;
}
