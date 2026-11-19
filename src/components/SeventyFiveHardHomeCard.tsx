import { router } from 'expo-router';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { todayKey } from '../lib/date';
import { challengeDayNumber, HARD_DAYS, HARD_RULE_LABELS, HARD_RULES, missedChallengeDate, ruleFlags, rulesDone } from '../lib/hard75';
import { useGlowStore } from '../store/useGlowStore';
import { colors, radius } from '../theme';
import type { HardRuleId } from '../lib/hard75';
import { Button, Card } from './ui';

const SHORT: Record<HardRuleId, string> = {
  rule1: 'Diet. No cheat meals, no alcohol',
  rule2: 'Two workouts, one outside',
  rule3: 'One gallon of water',
  rule4: 'Read 10 pages',
  rule5: 'Progress picture',
};

export function SeventyFiveHardHomeCard() {
  const hard = useGlowStore((s) => s.seventyFiveHard);
  const start = useGlowStore((s) => s.startSeventyFiveHard);
  const toggle = useGlowStore((s) => s.toggleHardRule);
  const [open, setOpen] = useState(true);
  const today = todayKey();
  const log = hard.dailyLogs[today];
  const done = rulesDone(log);
  const flags = log ? ruleFlags(log) : null;
  const day = challengeDayNumber(hard.startDate, today);
  const missed = missedChallengeDate(hard, today);

  if (!hard.isActive) {
    const paused = !!hard.startDate;
    return (
      <Card style={styles.card} >
        <View testID="hard75-home-card">
          <Text style={styles.kicker}>75 Hard</Text>
          <Text style={styles.title}>{paused ? `Paused on day ${day}` : 'Start 75 Hard'}</Text>
          <Text style={styles.body}>
            {paused
              ? 'Your completed days are saved. Resume when you are ready, or restart from Day 1 in the hub.'
              : 'Five rules, 75 days. Diet, two workouts, a gallon of water, ten pages, and a progress photo.'}
          </Text>
          <Button testID="hard75-start" label={paused ? 'Resume 75 Hard' : 'Start 75 Hard Challenge'} onPress={start} style={{ marginTop: 12 }} />
          <Pressable testID="hard75-open-hub" accessibilityRole="button" onPress={() => router.push('/hard')} style={styles.link}>
            <Text style={styles.linkText}>Open 75 Hard Hub</Text>
          </Pressable>
        </View>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View testID="hard75-home-card">
        <Pressable testID="hard75-toggle" accessibilityRole="button" aria-expanded={open} onPress={() => setOpen((v) => !v)} style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>75 Hard</Text>
            <Text style={styles.title}>🔥 75 Hard — Day {day} / {HARD_DAYS}</Text>
            <Text style={styles.meta}>{done}/5 Rules Done</Text>
          </View>
          {open ? <ChevronUp size={18} color={colors.espressoSoft} /> : <ChevronDown size={18} color={colors.espressoSoft} />}
        </Pressable>
        <View style={styles.dots}>
          {HARD_RULES.map((rule) => (
            <View key={rule} style={[styles.dot, flags?.[rule] && styles.dotOn]} />
          ))}
        </View>
        {missed ? (
          <Pressable testID="hard75-missed" accessibilityRole="button" onPress={() => router.push('/hard')} style={styles.missed}>
            <Text style={styles.missedText}>A day was missed. Official mode asks you to reset to Day 1.</Text>
          </Pressable>
        ) : null}
        {open
          ? HARD_RULES.map((rule, index) => {
              const on = !!flags?.[rule];
              return (
                <Pressable
                  key={rule}
                  testID={`hard75-home-rule-${index + 1}`}
                  accessibilityRole="checkbox"
                  aria-checked={on}
                  onPress={() => toggle((index + 1) as 1 | 2 | 3 | 4 | 5)}
                  style={styles.rule}
                >
                  <View style={[styles.box, on && styles.boxOn]}>
                    <Text style={styles.boxMark}>{on ? '✓' : ''}</Text>
                  </View>
                  <Text style={styles.ruleText}>{SHORT[rule]}</Text>
                </Pressable>
              );
            })
          : null}
        <Pressable testID="hard75-open-hub" accessibilityRole="button" onPress={() => router.push('/hard')} style={styles.link}>
          <Text style={styles.linkText}>Open 75 Hard Hub</Text>
        </Pressable>
        <Text style={styles.fine}>{HARD_RULE_LABELS.rule2}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 14, borderWidth: 1.5, borderColor: colors.butter },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kicker: { fontSize: 11, fontWeight: '800', color: colors.matchaDeep, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 18, fontWeight: '800', color: colors.espresso, marginTop: 2 },
  body: { fontSize: 13, color: colors.espressoSoft, marginTop: 6, lineHeight: 18 },
  meta: { fontSize: 13, fontWeight: '700', color: colors.espressoSoft, marginTop: 2 },
  dots: { flexDirection: 'row', gap: 6, marginTop: 10 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.cardSoft, borderWidth: 1, borderColor: colors.line },
  dotOn: { backgroundColor: colors.matcha, borderColor: colors.matcha },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.oat },
  boxOn: { backgroundColor: colors.matcha, borderColor: colors.matcha },
  boxMark: { fontSize: 14, fontWeight: '900', color: colors.espresso },
  ruleText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.espresso },
  link: { marginTop: 12, alignSelf: 'flex-start' },
  linkText: { fontSize: 14, fontWeight: '800', color: colors.matchaDeep },
  fine: { fontSize: 11, color: colors.muted, marginTop: 6 },
  missed: { marginTop: 10, backgroundColor: colors.peachTint, borderRadius: radius.md, padding: 10 },
  missedText: { fontSize: 13, fontWeight: '700', color: colors.espresso },
});
