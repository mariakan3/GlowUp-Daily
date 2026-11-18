import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNativeDriver } from '../lib/feedback';
import { useGlowStore } from '../store/useGlowStore';
import { colors, radius, shadow } from '../theme';
import type { Toast } from '../types';

const kindStyle: Record<Toast['kind'], { bg: string; fg: string }> = {
  win: { bg: colors.butter, fg: colors.espresso },
  super: { bg: colors.lilac, fg: colors.espresso },
  focus: { bg: colors.matcha, fg: colors.espresso },
  info: { bg: colors.espresso, fg: colors.oat },
};

function ToastBubble({ toast, index }: { toast: Toast; index: number }) {
  const dismiss = useGlowStore((s) => s.dismissToast);
  const progress = useState(() => new Animated.Value(0))[0];
  const isSuper = toast.kind === 'super';

  useEffect(() => {
    const anim = Animated.sequence([
      Animated.spring(progress, { toValue: 1, useNativeDriver, speed: 18, bounciness: isSuper ? 16 : 10 }),
      Animated.delay(isSuper ? 1500 : 1000),
      Animated.timing(progress, { toValue: 2, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver }),
    ]);
    anim.start(({ finished }) => finished && dismiss(toast.id));
    return () => anim.stop();
  }, [progress, dismiss, toast.id, isSuper]);

  const translateY = progress.interpolate({ inputRange: [0, 1, 2], outputRange: [24, 0, -36] });
  const opacity = progress.interpolate({ inputRange: [0, 0.4, 1, 1.6, 2], outputRange: [0, 1, 1, 0.6, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1, 2], outputRange: [0.6, isSuper ? 1.12 : 1, 0.95] });
  const s = kindStyle[toast.kind];

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.bubble, { backgroundColor: s.bg, marginTop: index ? 8 : 0, opacity, transform: [{ translateY }, { scale }] }, isSuper && styles.superBubble]}
    >
      {isSuper ? <Text style={styles.burst}>✨🌟✨</Text> : null}
      <Text style={[styles.text, { color: s.fg }, isSuper && { fontSize: 18 }]}>{toast.text}</Text>
    </Animated.View>
  );
}

/** Floating "+1 Win ✨" badges. Mounted once at the root so wins from any screen celebrate. */
export function WinToastBanner() {
  const toasts = useGlowStore((s) => s.toasts);
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 12 }]}>
      {toasts.map((t, i) => (
        <ToastBubble key={t.id} toast={t} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000, elevation: 20 },
  bubble: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: radius.pill, ...shadow, shadowOpacity: 0.15, alignItems: 'center' },
  superBubble: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: radius.xl },
  burst: { fontSize: 20, marginBottom: 2 },
  text: { fontSize: 15, fontWeight: '800' },
});
