import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, ui } from '../components/ui';
import { shelfSuggestions, taskSuggestions } from '../data/suggestions';
import { winFeedback } from '../lib/feedback';
import { useGlowStore } from '../store/useGlowStore';
import { categoryMeta, categoryOrder, colors, radius } from '../theme';
import type { RoutineId } from '../types';

const STARTER_PER_CATEGORY = 5;

function Choice({ label, emoji, on, onPress, testID }: { label: string; emoji: string; on: boolean; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="checkbox"
      aria-checked={on}
      accessibilityLabel={label}
      onPress={() => {
        winFeedback('tap');
        onPress();
      }}
      style={[styles.choice, on && styles.choiceOn]}
    >
      <Text style={styles.choiceText} numberOfLines={1}>
        {emoji} {label}
      </Text>
      {on ? <Check size={14} color={colors.espresso} strokeWidth={3} /> : null}
    </Pressable>
  );
}

export function OnboardingScreen() {
  const completeOnboarding = useGlowStore((s) => s.completeOnboarding);
  const initialName = useGlowStore((s) => s.userName);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [picked, setPicked] = useState<string[]>([]);
  const [steps, setSteps] = useState<{ routine: RoutineId; title: string }[]>([]);

  const toggleTask = (title: string) => setPicked((p) => (p.includes(title) ? p.filter((x) => x !== title) : [...p, title]));
  const toggleStep = (routine: RoutineId, title: string) =>
    setSteps((p) => (p.some((x) => x.routine === routine && x.title === title) ? p.filter((x) => !(x.routine === routine && x.title === title)) : [...p, { routine, title }]));

  const finish = () => {
    const tasks = taskSuggestions
      .filter((t) => picked.includes(t.title))
      .map(({ title, emoji, category, timeOfDay, tier, days, sport, minutes }) => ({ title, emoji, category, timeOfDay, tier, days, sport, minutes }));
    const shelf = (['am', 'pm'] as RoutineId[]).flatMap((r) =>
      shelfSuggestions[r].filter((sg) => steps.some((x) => x.routine === r && x.title === sg.title)).map((sg) => ({ routine: r, title: sg.title, emoji: sg.emoji })),
    );
    winFeedback('super');
    completeOnboarding({ name, tasks, steps: shelf });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i <= step && { backgroundColor: colors.matcha, width: 28 }]} />
          ))}
        </View>

        {step === 0 ? (
          <>
            <Text style={styles.title}>Welcome to GlowUp Daily ✨</Text>
            <Text style={styles.sub}>Every tiny thing you do counts as a win. Let’s set up your days in under a minute.</Text>
            <Text style={ui.label}>What should we call you?</Text>
            <TextInput testID="onboarding-name" value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={colors.muted} style={ui.input} autoFocus />
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Text style={styles.title}>Pick your first wins</Text>
            <Text style={styles.sub}>Tap any that fit your life. You can edit, schedule and add your own anytime.</Text>
            {categoryOrder.map((c) => (
              <View key={c} style={{ marginTop: 14 }}>
                <Text style={styles.cat}>
                  {categoryMeta[c].emoji} {categoryMeta[c].label}
                </Text>
                <View style={styles.wrap}>
                  {taskSuggestions
                    .filter((t) => t.category === c)
                    .slice(0, STARTER_PER_CATEGORY)
                    .map((t) => (
                      <Choice key={t.title} testID="onboarding-task" label={t.title} emoji={t.emoji} on={picked.includes(t.title)} onPress={() => toggleTask(t.title)} />
                    ))}
                </View>
              </View>
            ))}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Text style={styles.title}>Build your skincare shelves</Text>
            <Text style={styles.sub}>Each step you tap off in order is its own win. Pick the ones you use.</Text>
            {(['am', 'pm'] as RoutineId[]).map((r) => (
              <View key={r} style={{ marginTop: 14 }}>
                <Text style={styles.cat}>{r === 'am' ? '🌤️ AM Shelf' : '🌙 PM Shelf'}</Text>
                <View style={styles.wrap}>
                  {shelfSuggestions[r].slice(0, 6).map((sg) => (
                    <Choice key={sg.title} testID={`onboarding-${r}`} label={sg.title} emoji={sg.emoji} on={steps.some((x) => x.routine === r && x.title === sg.title)} onPress={() => toggleStep(r, sg.title)} />
                  ))}
                </View>
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.footer}>
          {step < 2 ? (
            <Button testID="onboarding-next" label={step === 0 ? 'Continue' : picked.length ? `Continue with ${picked.length} win${picked.length === 1 ? '' : 's'}` : 'Continue'} onPress={() => setStep((s) => s + 1)} />
          ) : (
            <Button testID="onboarding-finish" label="Start my first day ✨" onPress={finish} />
          )}
          <Pressable testID="onboarding-skip" onPress={step < 2 ? () => setStep((s) => s + 1) : finish} style={styles.skip}>
            <Text style={styles.skipText}>{step === 0 ? 'Skip' : step === 1 ? 'I’ll add my own later' : 'Skip shelves for now'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.oat },
  scroll: { padding: 20, paddingBottom: 40, width: '100%', maxWidth: 520, alignSelf: 'center' },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 22, marginTop: 8 },
  dot: { height: 6, width: 14, borderRadius: 3, backgroundColor: colors.line },
  title: { fontSize: 26, fontWeight: '900', color: colors.espresso, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.espressoSoft, marginTop: 6 },
  cat: { fontSize: 13, fontWeight: '800', color: colors.espresso, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.line, maxWidth: '100%' },
  choiceOn: { backgroundColor: colors.matchaTint, borderColor: colors.matcha },
  choiceText: { fontSize: 13, fontWeight: '600', color: colors.espresso, flexShrink: 1 },
  footer: { marginTop: 28 },
  skip: { alignSelf: 'center', marginTop: 12, padding: 6 },
  skipText: { fontSize: 13, fontWeight: '700', color: colors.espressoSoft },
});
