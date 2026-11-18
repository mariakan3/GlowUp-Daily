import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { formatClock } from '../lib/date';
import { useNativeDriver, winFeedback } from '../lib/feedback';
import { useNow, useToday } from '../lib/hooks';
import { activeTasksFor, doneTaskIds } from '../lib/plan';
import { rouletteCandidates, type QuickWinCandidate } from '../services/aiPlannerService';
import { useGlowStore } from '../store/useGlowStore';
import { categoryMeta, colors, radius, shadow } from '../theme';
import { GlowProgressRing } from './GlowProgressRing';
import { Sheet } from './Sheet';
import { Button } from './ui';

export const QUICK_WIN_SECONDS = 120;
const SPIN_DELAYS = [60, 60, 70, 70, 80, 90, 100, 120, 140, 170, 210, 260, 320];

export function DopamineRouletteModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return <Roulette onClose={onClose} />;
}

type Phase = 'spinning' | 'timer' | 'claimed';

function Roulette({ onClose }: { onClose: () => void }) {
  const today = useToday();
  const completeQuickWin = useGlowStore((s) => s.completeQuickWin);
  const [candidates, setCandidates] = useState<QuickWinCandidate[]>(() => {
    const s = useGlowStore.getState();
    return rouletteCandidates(activeTasksFor(s.tasks, s.dayPlan, today), doneTaskIds(s.events, today));
  });
  const [spinId, setSpinId] = useState(0);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('spinning');
  const [startedAt, setStartedAt] = useState(0);
  const [beatTimer, setBeatTimer] = useState(false);
  const [bump] = useState(() => new Animated.Value(0));
  const [pop] = useState(() => new Animated.Value(1));

  useEffect(() => {
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;
    const landing = Math.floor(Math.random() * candidates.length);
    const total = SPIN_DELAYS.length;
    const tick = () => {
      step++;
      const remaining = total - step;
      setIndex((landing - remaining + candidates.length * 10) % candidates.length);
      bump.setValue(1);
      Animated.timing(bump, { toValue: 0, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver }).start();
      winFeedback('tap');
      if (step < total) {
        timer = setTimeout(tick, SPIN_DELAYS[step]);
      } else {
        winFeedback('win');
        Animated.sequence([
          Animated.spring(pop, { toValue: 1.08, useNativeDriver, speed: 30, bounciness: 18 }),
          Animated.spring(pop, { toValue: 1, useNativeDriver, speed: 14 }),
        ]).start();
        setStartedAt(Date.now());
        setPhase('timer');
      }
    };
    timer = setTimeout(tick, SPIN_DELAYS[0]);
    return () => clearTimeout(timer);
  }, [spinId, candidates.length, bump, pop]);

  const now = useNow(phase === 'timer', 250);
  const elapsed = phase === 'timer' ? Math.max(0, (now - startedAt) / 1000) : 0;
  const remaining = Math.max(0, QUICK_WIN_SECONDS - elapsed);
  const expired = phase === 'timer' && remaining <= 0;
  const pick = candidates[index];

  const respin = () => {
    const s = useGlowStore.getState();
    setCandidates(rouletteCandidates(activeTasksFor(s.tasks, s.dayPlan, today), doneTaskIds(s.events, today)));
    setPhase('spinning');
    setSpinId((n) => n + 1);
  };

  const claim = () => {
    const inTime = Date.now() - startedAt <= QUICK_WIN_SECONDS * 1000;
    completeQuickWin(pick, inTime);
    winFeedback(inTime ? 'super' : 'win');
    setBeatTimer(inTime);
    setPhase('claimed');
  };

  const cat = categoryMeta[pick.category];
  const translateY = bump.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });

  return (
    <Sheet visible onClose={onClose} title="🎲 Need a Quick Win?" subtitle="One effortless thing. Under 2 minutes. Go.">
      <Animated.View style={[styles.card, { backgroundColor: cat.tint, transform: [{ scale: pop }] }]}>
        <Animated.View style={{ alignItems: 'center', transform: [{ translateY }] }}>
          <Text style={styles.emoji}>{pick.emoji}</Text>
          <Text testID="roulette-pick" style={styles.title}>
            {pick.title}
          </Text>
          <Text style={styles.source}>{phase === 'spinning' ? 'Spinning…' : pick.taskId ? `From your list · ${cat.short}` : `Instant micro-win · ${cat.short}`}</Text>
        </Animated.View>
      </Animated.View>

      {phase === 'timer' ? (
        <View style={styles.timerWrap}>
          <GlowProgressRing progress={remaining / QUICK_WIN_SECONDS} size={130} stroke={10} color={expired ? colors.line : colors.peach} secondaryColor={colors.butter}>
            <Text testID="roulette-clock" style={styles.clock}>
              {formatClock(remaining)}
            </Text>
            <Text style={styles.clockSub}>{expired ? 'time’s up' : 'for +2 bonus'}</Text>
          </GlowProgressRing>
          <Text style={styles.hint}>{expired ? 'No bonus this time, but it still counts as a win 💛' : 'Finish before the timer ends for a +2 Momentum Win ⚡'}</Text>
          <Button testID="roulette-claim" label={expired ? 'Done anyway · +1' : 'Done! Claim my wins ✅'} onPress={claim} style={{ alignSelf: 'stretch' }} />
          <Button testID="roulette-respin" label="Spin again 🎲" variant="soft" onPress={respin} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </View>
      ) : null}

      {phase === 'claimed' ? (
        <View style={styles.timerWrap} testID="roulette-claimed">
          <Text style={styles.claimed}>{beatTimer ? '⚡ +1 win & +2 Momentum bonus!' : '✨ +1 win banked'}</Text>
          <Text style={styles.hint}>Momentum is a habit. Want another?</Text>
          <Button label="Another one 🎲" onPress={respin} style={{ alignSelf: 'stretch' }} />
          <Button label="Back to my day" variant="soft" onPress={onClose} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, paddingVertical: 28, paddingHorizontal: 20, marginTop: 10, alignItems: 'center', minHeight: 170, justifyContent: 'center', ...shadow },
  emoji: { fontSize: 44 },
  title: { fontSize: 19, fontWeight: '800', color: colors.espresso, textAlign: 'center', marginTop: 10 },
  source: { fontSize: 12, color: colors.espressoSoft, marginTop: 6, fontWeight: '600' },
  timerWrap: { alignItems: 'center', marginTop: 18 },
  clock: { fontSize: 28, fontWeight: '900', color: colors.espresso, fontVariant: ['tabular-nums'] },
  clockSub: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  hint: { fontSize: 13, color: colors.espressoSoft, textAlign: 'center', marginVertical: 14 },
  claimed: { fontSize: 20, fontWeight: '900', color: colors.espresso, textAlign: 'center' },
});
