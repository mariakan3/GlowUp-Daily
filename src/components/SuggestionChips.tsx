import { Sparkles } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { winFeedback } from '../lib/feedback';
import { colors, radius } from '../theme';

export interface SuggestionItem {
  key: string;
  label: string;
  emoji?: string;
}

/** Tappable ideas shown while the user creates something; the caller filters by what's typed and what exists. */
export function SuggestionChips({
  items,
  onPick,
  title = 'Suggestions',
  emptyText,
  horizontal = false,
  testID,
}: {
  items: SuggestionItem[];
  onPick: (key: string) => void;
  title?: string;
  emptyText?: string;
  horizontal?: boolean;
  testID?: string;
}) {
  if (!items.length && !emptyText) return null;
  const chips = items.map((i) => (
    <Pressable
      key={i.key}
      testID={testID ? `${testID}-chip` : undefined}
      accessibilityRole="button"
      accessibilityLabel={`Suggestion: ${i.label}`}
      onPress={() => {
        winFeedback('tap');
        onPick(i.key);
      }}
      style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }]}
    >
      <Text style={styles.chipText} numberOfLines={1}>
        {i.emoji ? `${i.emoji} ` : ''}
        {i.label}
      </Text>
    </Pressable>
  ));
  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.header}>
        <Sparkles size={12} color={colors.matchaDeep} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {items.length === 0 ? (
        <Text style={styles.empty}>{emptyText}</Text>
      ) : horizontal ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }}>
          {chips}
        </ScrollView>
      ) : (
        <View style={styles.grid}>{chips}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  title: { fontSize: 11, fontWeight: '800', color: colors.matchaDeep, textTransform: 'uppercase', letterSpacing: 0.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.matchaTint, borderWidth: 1, borderColor: '#D3E0CB', maxWidth: '100%' },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.espresso },
  empty: { fontSize: 12, color: colors.muted },
});
