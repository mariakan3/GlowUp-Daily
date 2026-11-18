import type { FocusPreset } from '../types';

export const focusPresets: FocusPreset[] = [
  { id: 'pomodoro', name: 'Pomodoro', focusMin: 25, breakMin: 5, emoji: '🍅' },
  { id: 'exam', name: 'Exam Grind', focusMin: 50, breakMin: 10, emoji: '🔥' },
  { id: 'sprint', name: 'Quick Sprint', focusMin: 15, breakMin: 3, emoji: '⚡' },
];

export const DEFAULT_FOCUS_SUBJECT = 'Deep work';
