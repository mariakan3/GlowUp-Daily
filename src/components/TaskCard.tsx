import { Check } from 'lucide-react-native';
import { memo, useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { isWeb, useNativeDriver, winFeedback } from '../lib/feedback';
import { categoryMeta, colors, radius, shadow } from '../theme';
import type { CategoryId } from '../types';

interface Props {
  title: string;
  emoji: string;
  category: CategoryId;
  done: boolean;
  onToggle: () => boolean | void;
  meta?: string;
  winLabel?: string;
  dimmed?: boolean;
  onLongPress?: () => void;
  testID?: string;
}

/** One-tap micro-win row: haptic (or web bounce), check pop, strike-through and +1 chip. */
export const TaskCard = memo(function TaskCard({ title, emoji, category, done, onToggle, meta, winLabel = '+1', dimmed, onLongPress, testID }: Props) {
  const cat = categoryMeta[category];
  const scale = useState(() => new Animated.Value(1))[0];
  const check = useState(() => new Animated.Value(done ? 1 : 0))[0];

  useEffect(() => {
    Animated.spring(check, { toValue: done ? 1 : 0, useNativeDriver, speed: 20, bounciness: 14 }).start();
  }, [done, check]);

  const handlePress = () => {
    const completed = onToggle();
    const nowDone = completed === undefined ? !done : completed;
    winFeedback(nowDone ? 'win' : 'undo');
    const peak = nowDone ? (isWeb ? 1.06 : 1.03) : 0.98;
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 70, useNativeDriver }),
      Animated.spring(scale, { toValue: peak, useNativeDriver, speed: 40, bounciness: 18 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver, speed: 16, bounciness: 8 }),
    ]).start();
  };

  const checkScale = check.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        testID={testID}
        accessibilityRole="checkbox"
        aria-checked={done}
        accessibilityLabel={title}
        onPress={handlePress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.card, done && { backgroundColor: cat.tint }, dimmed && { opacity: 0.55 }, pressed && { opacity: 0.9 }]}
      >
        <View style={[styles.emojiWrap, { backgroundColor: done ? colors.card : cat.tint }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, done && styles.titleDone]} numberOfLines={2}>
            {title}
          </Text>
          {meta ? <Text style={styles.meta}>{meta}</Text> : null}
        </View>
        {!done ? (
          <View style={[styles.winChip, { backgroundColor: cat.tint }]}>
            <Text style={styles.winChipText}>{winLabel}</Text>
          </View>
        ) : null}
        <View style={[styles.checkbox, { borderColor: done ? cat.color : colors.line }]}>
          <Animated.View style={[styles.checkFill, { backgroundColor: cat.color, opacity: check, transform: [{ scale: checkScale }] }]}>
            <Check size={16} color={colors.espresso} strokeWidth={3} />
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    ...shadow,
    shadowOpacity: 0.04,
  },
  emojiWrap: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 20 },
  title: { fontSize: 15, fontWeight: '600', color: colors.espresso },
  titleDone: { textDecorationLine: 'line-through', color: colors.espressoSoft },
  meta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  winChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  winChipText: { fontSize: 11, fontWeight: '800', color: colors.espressoSoft },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  checkFill: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
