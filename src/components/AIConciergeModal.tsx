import { Settings2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNativeDriver, winFeedback } from '../lib/feedback';
import { batteryOptions, dayPresets, homeTimeOptions, movementOptions, presetOrder } from '../services/aiPlannerService';
import { useGlowStore } from '../store/useGlowStore';
import { colors, energyMeta, radius } from '../theme';
import type { BatteryLevel, DayPresetId, HomeTime, MovementPick, RemixResult } from '../types';
import { AISettingsModal } from './AISettingsModal';
import { Sheet } from './Sheet';
import { Button, IconButton, Pill, ui } from './ui';

const loadingCopy = [
  'Balancing your dopamine schedule...',
  'Compressing chores into micro-wins...',
  'Chunking study into 45-min sprints...',
  'Packing your sports bag (mentally)...',
  'Sprinkling in brain breaks...',
];

const MIN_LOADING_MS = 1600;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Shimmer() {
  const [pulse] = useState(() => new Animated.Value(0));
  const [copyIdx, setCopyIdx] = useState(0);
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver }),
      ]),
    );
    loop.start();
    const id = setInterval(() => setCopyIdx((i) => (i + 1) % loadingCopy.length), 900);
    return () => {
      loop.stop();
      clearInterval(id);
    };
  }, [pulse]);
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  return (
    <View testID="remix-loading" style={{ paddingVertical: 12 }}>
      <Text style={styles.loadingTitle}>✨ {loadingCopy[copyIdx]}</Text>
      {[0.92, 0.7, 0.84, 0.6, 0.76].map((w, i) => (
        <Animated.View key={i} style={[styles.skeleton, { opacity }]}>
          <View style={styles.skeletonDot} />
          <View style={[styles.skeletonLine, { width: `${w * 80}%` }]} />
        </Animated.View>
      ))}
    </View>
  );
}

export function AIConciergeModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return <ConciergeSheet onClose={onClose} />;
}

function ConciergeSheet({ onClose }: { onClose: () => void }) {
  const applyAIRemix = useGlowStore((s) => s.applyAIRemix);
  const aiSettings = useGlowStore((s) => s.aiSettings);
  const lastProfile = useGlowStore((s) => s.aiScheduleProfile);
  const [presetId, setPresetId] = useState<DayPresetId | null>(lastProfile?.presetId ?? null);
  const [battery, setBattery] = useState<BatteryLevel>(lastProfile?.battery ?? 'medium');
  const [movement, setMovement] = useState<MovementPick>(lastProfile?.movement ?? 'tennis');
  const [homeTime, setHomeTime] = useState<HomeTime>(lastProfile?.homeTime ?? 30);
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<'form' | 'loading' | 'done'>('form');
  const [result, setResult] = useState<RemixResult | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const choosePreset = (id: DayPresetId) => {
    winFeedback('tap');
    if (presetId === id) {
      setPresetId(null);
      return;
    }
    const p = dayPresets[id];
    setPresetId(id);
    setBattery(p.battery);
    setMovement(p.movement);
    setHomeTime(p.homeTime);
  };

  const generate = async () => {
    winFeedback('tap');
    setPhase('loading');
    const [res] = await Promise.all([applyAIRemix({ presetId, battery, movement, homeTime, prompt }), sleep(MIN_LOADING_MS)]);
    winFeedback('super');
    setResult(res);
    setPhase('done');
  };

  const engineLabel = aiSettings.provider === 'off' || !aiSettings.hasKey ? 'Smart Rules · on-device' : `${aiSettings.provider === 'openai' ? 'OpenAI' : 'Gemini'} ${aiSettings.model} · Smart Rules backup`;

  return (
    <Sheet
      visible
      onClose={onClose}
      title="✨ AI Remix My Day"
      subtitle="Tell me about today. I’ll rebuild your wins around it."
      footer={
        phase === 'form' ? (
          <Button testID="remix-generate" label="Generate My 20 Wins ✨" onPress={generate} style={{ marginTop: 8 }} />
        ) : phase === 'done' ? (
          <Button testID="remix-done" label="See my new day" onPress={onClose} style={{ marginTop: 8 }} />
        ) : null
      }
    >
      {phase === 'loading' ? <Shimmer /> : null}

      {phase === 'done' && result ? (
        <View testID="remix-result" style={{ paddingTop: 8 }}>
          <View style={styles.resultCard}>
            <Text style={styles.resultSummary}>{result.summary}</Text>
            <Text style={styles.resultEngine}>
              {result.engine === 'rules' ? '✨ Smart Rules engine' : `🤖 ${result.engine === 'openai' ? 'OpenAI' : 'Gemini'} live plan`} · {energyMeta[result.energyMode].emoji} {energyMeta[result.energyMode].label}
            </Text>
            {result.fallbackReason ? (
              <Text testID="remix-fallback" style={styles.fallback}>
                {result.fallbackReason}, so Smart Rules planned your day instead.
              </Text>
            ) : null}
          </View>
          {result.changes.map((c) => (
            <View key={c} style={styles.change}>
              <Text style={styles.changeDot}>✦</Text>
              <Text style={styles.changeText}>{c}</Text>
            </View>
          ))}
          <Text style={[ui.muted, { marginTop: 10 }]}>Changed your mind? Tap “↩️ Undo AI Remix” on Today.</Text>
        </View>
      ) : null}

      {phase === 'form' ? (
        <>
          <View style={styles.engineRow}>
            <Text style={styles.engineText} numberOfLines={1}>
              Engine: {engineLabel}
            </Text>
            <IconButton testID="ai-settings-open" label="AI settings" onPress={() => setSettingsOpen(true)}>
              <Settings2 size={16} color={colors.espresso} />
            </IconButton>
          </View>

          <Text style={ui.label}>1-tap day presets</Text>
          <View style={styles.presets}>
            {presetOrder.map((id) => {
              const p = dayPresets[id];
              const on = presetId === id;
              return (
                <Pressable
                  key={id}
                  testID={`preset-day-${id}`}
                  aria-selected={on}
                  accessibilityRole="button"
                  onPress={() => choosePreset(id)}
                  style={({ pressed }) => [styles.preset, on && styles.presetOn, pressed && { transform: [{ scale: 0.98 }] }]}
                >
                  <Text style={styles.presetEmoji}>{p.emoji}</Text>
                  <Text style={styles.presetTitle}>{p.label}</Text>
                  <Text style={styles.presetBlurb}>{p.blurb}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={ui.label}>Battery level</Text>
          <View style={styles.row}>
            {batteryOptions.map((b) => {
              const on = battery === b.value;
              return (
                <Pressable key={b.value} testID={`battery-${b.value}`} aria-selected={on} onPress={() => setBattery(b.value)} style={[styles.battery, on && styles.batteryOn]}>
                  <View style={styles.batteryShell}>
                    <View style={[styles.batteryFill, { width: `${b.pct}%`, backgroundColor: b.value === 'low' ? colors.peach : b.value === 'medium' ? colors.butter : colors.matcha }]} />
                  </View>
                  <Text style={styles.batteryLabel}>{b.label}</Text>
                  <Text style={styles.batteryPct}>{b.pct}%</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={ui.label}>Today’s movement pick</Text>
          <View style={styles.wrap}>
            {movementOptions.map((m) => (
              <Pill key={m.value} testID={`move-${m.value}`} small label={`${m.label} ${m.emoji}`} active={movement === m.value} onPress={() => setMovement(m.value)} />
            ))}
          </View>

          <Text style={ui.label}>Time for home & cooking</Text>
          <View style={styles.wrap}>
            {homeTimeOptions.map((h) => (
              <Pill key={h.value} testID={`home-${h.value}`} small label={`${h.label} · ${h.hint}`} active={homeTime === h.value} color={colors.peach} tint={colors.peachTint} onPress={() => setHomeTime(h.value)} />
            ))}
          </View>

          <Text style={ui.label}>Anything specific?</Text>
          <TextInput
            testID="remix-prompt"
            value={prompt}
            onChangeText={setPrompt}
            multiline
            placeholder="Studying 4 hours for finals today, tennis at 5pm, skip heavy cleaning."
            placeholderTextColor={colors.muted}
            style={[ui.input, { minHeight: 76, textAlignVertical: 'top' }]}
            maxLength={400}
          />
        </>
      ) : null}
      <AISettingsModal visible={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  engineRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.lilacTint, borderRadius: radius.md, paddingVertical: 6, paddingLeft: 12, paddingRight: 6, marginTop: 8 },
  engineText: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.espresso },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: { width: '48%', flexGrow: 1, borderRadius: radius.md, padding: 12, backgroundColor: colors.oat, borderWidth: 2, borderColor: colors.line },
  presetOn: { backgroundColor: colors.lilacTint, borderColor: colors.lilac },
  presetEmoji: { fontSize: 22 },
  presetTitle: { fontSize: 13, fontWeight: '800', color: colors.espresso, marginTop: 4 },
  presetBlurb: { fontSize: 11, color: colors.espressoSoft, marginTop: 2 },
  row: { flexDirection: 'row', gap: 8 },
  battery: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.oat },
  batteryOn: { borderColor: colors.espresso, backgroundColor: colors.card },
  batteryShell: { width: 44, height: 18, borderRadius: 5, borderWidth: 2, borderColor: colors.espresso, padding: 2, overflow: 'hidden' },
  batteryFill: { height: '100%', borderRadius: 2 },
  batteryLabel: { fontSize: 12, fontWeight: '800', color: colors.espresso, marginTop: 6 },
  batteryPct: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  loadingTitle: { fontSize: 15, fontWeight: '800', color: colors.espresso, marginBottom: 14, textAlign: 'center' },
  skeleton: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.cardSoft, borderRadius: radius.md, padding: 14, marginBottom: 8 },
  skeletonDot: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.lilacTint },
  skeletonLine: { height: 12, borderRadius: 6, backgroundColor: colors.line },
  resultCard: { backgroundColor: colors.lilacTint, borderRadius: radius.lg, padding: 16, marginBottom: 10 },
  resultSummary: { fontSize: 16, fontWeight: '800', color: colors.espresso },
  resultEngine: { fontSize: 12, color: colors.espressoSoft, marginTop: 6, fontWeight: '600' },
  fallback: { fontSize: 12, color: colors.espresso, marginTop: 8, backgroundColor: colors.butterTint, borderRadius: radius.sm, padding: 8, overflow: 'hidden' },
  change: { flexDirection: 'row', gap: 8, paddingVertical: 5 },
  changeDot: { color: colors.matchaDeep, fontWeight: '900' },
  changeText: { flex: 1, fontSize: 13, color: colors.espresso },
});
