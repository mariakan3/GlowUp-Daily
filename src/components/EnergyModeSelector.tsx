import { Pressable, StyleSheet, Text, View } from 'react-native';
import { winFeedback } from '../lib/feedback';
import { useGlowStore } from '../store/useGlowStore';
import { colors, energyMeta, energyOrder, radius } from '../theme';
import type { EnergyMode } from '../types';

export function EnergyModeSelector({ mode }: { mode: EnergyMode }) {
  const setEnergyMode = useGlowStore((s) => s.setEnergyMode);
  const pushToast = useGlowStore((s) => s.pushToast);

  const choose = (m: EnergyMode) => {
    if (m === mode) return;
    winFeedback('tap');
    setEnergyMode(m);
    const meta = energyMeta[m];
    pushToast(m === 'soft' ? `${meta.emoji} Soft Day on. Streak protected at ${meta.target} wins` : `${meta.emoji} ${meta.label}: ${meta.target} wins today`, 'info');
  };

  const active = energyMeta[mode];
  return (
    <View>
      <View style={styles.row}>
        {energyOrder.map((m) => {
          const meta = energyMeta[m];
          const selected = m === mode;
          return (
            <Pressable
              key={m}
              testID={`energy-${m}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${meta.label}, ${meta.target} wins`}
              onPress={() => choose(m)}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: selected ? meta.color : colors.card, borderColor: selected ? meta.color : colors.line },
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
            >
              <Text style={styles.emoji}>{meta.emoji}</Text>
              <Text style={[styles.label, selected && { color: colors.espresso }]}>{meta.short}</Text>
              <Text style={[styles.target, selected && { color: colors.espresso }]}>{meta.target} wins</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={[styles.blurb, { backgroundColor: active.tint }]}>
        <Text style={styles.blurbText}>
          {mode === 'soft' ? '💛 ' : ''}
          {active.blurb}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: radius.md, borderWidth: 1.5 },
  emoji: { fontSize: 22 },
  label: { fontSize: 13, fontWeight: '800', color: colors.espressoSoft, marginTop: 4 },
  target: { fontSize: 11, color: colors.muted, marginTop: 1, fontWeight: '600' },
  blurb: { marginTop: 10, borderRadius: radius.md, paddingVertical: 10, paddingHorizontal: 14 },
  blurbText: { fontSize: 13, color: colors.espresso, fontWeight: '500' },
});
