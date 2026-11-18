import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { winFeedback } from '../lib/feedback';
import { useGlowStore } from '../store/useGlowStore';
import { colors, radius, sportMeta } from '../theme';
import type { MovementVibe, SportId } from '../types';
import { Sheet } from './Sheet';
import { Button, ui } from './ui';

const durations = [15, 30, 45, 60, 90];
const vibes: { value: MovementVibe; label: string }[] = [
  { value: '🔥', label: 'On fire' },
  { value: '🧘‍♀️', label: 'Zen' },
  { value: '⚡', label: 'Electric' },
  { value: '🎾', label: 'Playful' },
];

const notePlaceholder: Record<SportId, string> = {
  pilates: 'Core reformer class',
  tennis: 'Backhand felt amazing today',
  running: 'Easy pace by the sea',
  gym: 'Leg day, new PR',
  walk: 'Sunset walk with a podcast',
};

export function MovementLogModal({ sport, onClose }: { sport: SportId | null; onClose: () => void }) {
  const logMovement = useGlowStore((s) => s.logMovement);
  const [minutes, setMinutes] = useState(45);
  const [vibe, setVibe] = useState<MovementVibe>('🔥');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!sport) return;
    setMinutes(sport === 'tennis' ? 60 : sport === 'running' ? 30 : 45);
    setVibe(sport === 'tennis' ? '🎾' : sport === 'pilates' ? '🧘‍♀️' : sport === 'running' ? '⚡' : '🔥');
    setNote('');
  }, [sport]);

  const meta = sport ? sportMeta[sport] : null;

  const save = () => {
    if (!sport) return;
    logMovement({ sport, minutes, vibe, note });
    winFeedback('win');
    onClose();
  };

  return (
    <Sheet
      visible={!!sport}
      onClose={onClose}
      title={meta ? `${meta.emoji} Log ${meta.label}` : ''}
      subtitle="10 seconds, then back to your day"
      footer={<Button testID="log-movement" label="Log session · +1 win" onPress={save} style={{ marginTop: 8 }} />}
    >
      <Text style={ui.label}>Duration</Text>
      <View style={styles.row}>
        {durations.map((d) => (
          <Pressable
            key={d}
            testID={`duration-${d}`}
            onPress={() => setMinutes(d)}
            style={[styles.choice, minutes === d && { backgroundColor: meta?.color ?? colors.matcha, borderColor: meta?.color ?? colors.matcha }]}
          >
            <Text style={styles.choiceText}>{d}m</Text>
          </Pressable>
        ))}
      </View>

      <Text style={ui.label}>Vibe</Text>
      <View style={styles.row}>
        {vibes.map((v) => (
          <Pressable
            key={v.value}
            testID={`vibe-${v.label}`}
            onPress={() => setVibe(v.value)}
            style={[styles.vibe, vibe === v.value && { backgroundColor: meta?.tint ?? colors.matchaTint, borderColor: meta?.color ?? colors.matcha }]}
            accessibilityLabel={v.label}
          >
            <Text style={{ fontSize: 26 }}>{v.value}</Text>
            <Text style={styles.vibeLabel}>{v.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={ui.label}>Note (optional)</Text>
      <TextInput
        testID="movement-note"
        value={note}
        onChangeText={setNote}
        placeholder={sport ? notePlaceholder[sport] : ''}
        placeholderTextColor={colors.muted}
        style={ui.input}
        maxLength={120}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  choice: { flex: 1, paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center' },
  choiceText: { fontSize: 15, fontWeight: '800', color: colors.espresso },
  vibe: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line },
  vibeLabel: { fontSize: 11, color: colors.espressoSoft, fontWeight: '700', marginTop: 2 },
});
