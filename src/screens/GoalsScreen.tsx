import { Check, Pencil, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { AddGoalModal } from '../components/AddGoalModal';
import { IconButton, ProgressBar, SectionTitle } from '../components/ui';
import { useNativeDriver, winFeedback } from '../lib/feedback';
import { useGlowStore } from '../store/useGlowStore';
import { categoryMeta, colors, radius, shadow } from '../theme';
import type { Goal, Milestone } from '../types';

function MilestoneRow({ goal, ms, index, color, tint }: { goal: Goal; ms: Milestone; index: number; color: string; tint: string }) {
  const toggleMilestone = useGlowStore((s) => s.toggleMilestone);
  const burst = useState(() => new Animated.Value(0))[0];
  const scale = useState(() => new Animated.Value(1))[0];
  const done = !!ms.doneAt;

  const onPress = () => {
    const nowDone = toggleMilestone(goal.id, ms.id);
    winFeedback(nowDone ? 'super' : 'undo');
    if (nowDone) {
      burst.setValue(0);
      Animated.parallel([
        Animated.timing(burst, { toValue: 1, duration: 800, useNativeDriver }),
        Animated.sequence([
          Animated.spring(scale, { toValue: 1.06, useNativeDriver, speed: 40, bounciness: 20 }),
          Animated.spring(scale, { toValue: 1, useNativeDriver, speed: 14 }),
        ]),
      ]).start();
    }
  };

  const burstScale = burst.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.4] });
  const burstOpacity = burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        testID={`milestone-${ms.id}`}
        accessibilityRole="checkbox"
        aria-checked={done}
        accessibilityLabel={ms.title}
        onPress={onPress}
        style={[styles.ms, done && { backgroundColor: tint }]}
      >
        <View style={styles.rung}>
          <Animated.View pointerEvents="none" style={[styles.burst, { backgroundColor: color, opacity: burstOpacity, transform: [{ scale: burstScale }] }]} />
          <View style={[styles.msCheck, { borderColor: done ? color : colors.line, backgroundColor: done ? color : colors.card }]}>
            {done ? <Check size={14} color={colors.espresso} strokeWidth={3} /> : <Text style={styles.msNum}>{index + 1}</Text>}
          </View>
        </View>
        <Text style={[styles.msTitle, done && styles.msTitleDone]}>{ms.title}</Text>
        {!done ? <Text style={styles.superChip}>+3 🌟</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const cat = categoryMeta[goal.category];
  const done = goal.milestones.filter((m) => m.doneAt).length;
  const total = goal.milestones.length;
  const complete = total > 0 && done === total;
  return (
    <View style={[styles.goal, complete && { borderColor: cat.color, borderWidth: 2 }]} testID={`goal-${goal.id}`}>
      <View style={styles.goalHeader}>
        <View style={[styles.goalEmoji, { backgroundColor: cat.tint }]}>
          <Text style={{ fontSize: 24 }}>{goal.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.goalTitle}>{goal.title}</Text>
          <Text style={styles.goalMeta}>
            {cat.emoji} {cat.short} · {complete ? 'Conquered 👑' : `${done}/${total} milestones`}
          </Text>
        </View>
        <IconButton label={`Edit ${goal.title}`} onPress={onEdit}>
          <Pencil size={14} color={colors.espresso} />
        </IconButton>
      </View>
      <View style={{ marginVertical: 12 }}>
        <ProgressBar value={total ? done / total : 0} color={cat.color} height={10} />
      </View>
      <View>
        <View style={[styles.rail, { backgroundColor: cat.tint }]} />
        {goal.milestones.map((m, i) => (
          <MilestoneRow key={m.id} goal={goal} ms={m} index={i} color={cat.color} tint={cat.tint} />
        ))}
      </View>
    </View>
  );
}

export function GoalsScreen() {
  const goals = useGlowStore((s) => s.goals);
  const [modal, setModal] = useState<{ open: boolean; goal: Goal | null }>({ open: false, goal: null });
  const totalMs = goals.reduce((a, g) => a + g.milestones.length, 0);
  const doneMs = goals.reduce((a, g) => a + g.milestones.filter((m) => m.doneAt).length, 0);

  return (
    <View>
      <View style={styles.summary}>
        <Text style={styles.summaryNum}>
          {doneMs}/{totalMs}
        </Text>
        <Text style={styles.summaryText}>milestones reached · {doneMs * 3} Super Wins earned</Text>
      </View>
      <SectionTitle
        title="Milestone Path"
        subtitle="Big dreams, tiny steps"
        right={
          <IconButton testID="add-goal" label="Add goal" onPress={() => setModal({ open: true, goal: null })} style={{ backgroundColor: colors.espresso }}>
            <Plus size={18} color={colors.oat} />
          </IconButton>
        }
      />
      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} onEdit={() => setModal({ open: true, goal: g })} />
      ))}
      {goals.length === 0 ? <Text style={{ color: colors.muted, textAlign: 'center' }}>No goals yet. Tap + to dream big.</Text> : null}
      <AddGoalModal visible={modal.open} goal={modal.goal} onClose={() => setModal({ open: false, goal: null })} />
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { backgroundColor: colors.lilacTint, borderRadius: radius.lg, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  summaryNum: { fontSize: 28, fontWeight: '900', color: colors.espresso },
  summaryText: { flex: 1, fontSize: 13, color: colors.espressoSoft, fontWeight: '600' },
  goal: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, marginBottom: 14, borderWidth: 2, borderColor: 'transparent', ...shadow },
  goalHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalEmoji: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  goalTitle: { fontSize: 17, fontWeight: '800', color: colors.espresso },
  goalMeta: { fontSize: 12, color: colors.muted, marginTop: 2 },
  rail: { position: 'absolute', left: 22, top: 18, bottom: 18, width: 3, borderRadius: 2 },
  ms: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 8, borderRadius: radius.md, marginBottom: 2 },
  rung: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  burst: { position: 'absolute', width: 28, height: 28, borderRadius: 14 },
  msCheck: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  msNum: { fontSize: 12, fontWeight: '800', color: colors.espressoSoft },
  msTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.espresso },
  msTitleDone: { textDecorationLine: 'line-through', color: colors.espressoSoft },
  superChip: { fontSize: 11, fontWeight: '800', color: colors.espresso, backgroundColor: colors.butterTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
});
