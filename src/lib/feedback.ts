import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';

export type FeedbackKind = 'win' | 'super' | 'undo' | 'tap';

/**
 * Native haptics on iOS/Android. On web there is no Taptic engine, so callers pair this with a
 * visual bounce; we still try the Vibration API, which Android Chrome honours.
 */
export function winFeedback(kind: FeedbackKind = 'win') {
  if (isWeb) {
    const nav = globalThis.navigator as (Navigator & { vibrate?: (p: number | number[]) => boolean }) | undefined;
    try {
      nav?.vibrate?.(kind === 'super' ? [20, 40, 30] : kind === 'undo' ? 8 : 15);
    } catch {
      // Some browsers throw when vibrate is called without a user gesture; the visual bounce covers it.
    }
    return;
  }
  const run =
    kind === 'super'
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : kind === 'win'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        : kind === 'undo'
          ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          : Haptics.selectionAsync();
  run.catch(() => {});
}

export const useNativeDriver = !isWeb;
