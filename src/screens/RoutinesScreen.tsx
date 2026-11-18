import { ArrowDown, ArrowUp, Pencil, Plus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AddTaskModal } from '../components/AddTaskModal';
import { RoutineShelf } from '../components/RoutineShelf';
import { Button, IconButton, Pill, SectionTitle } from '../components/ui';
import { ALL_DAYS, daysLabel, weekdayShort } from '../lib/date';
import { winFeedback } from '../lib/feedback';
import { useGlowStore } from '../store/useGlowStore';
import { categoryMeta, categoryOrder, colors, radius, shadow, timeOfDayMeta } from '../theme';
import type { CategoryId, Task } from '../types';

const tierLabel = { 1: '🧸 Essential', 2: '🌿 Standard', 3: '🚀 High Era' } as const;

export function RoutinesScreen() {
  const tasks = useGlowStore((s) => s.tasks);
  const moveTask = useGlowStore((s) => s.moveTask);
  const toggleTaskDay = useGlowStore((s) => s.toggleTaskDay);
  const [filter, setFilter] = useState<CategoryId | 'custom'>('custom');
  const [modal, setModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });

  const list = useMemo(
    () => tasks.filter((t) => (filter === 'custom' ? t.custom : t.category === filter)).sort((a, b) => a.order - b.order),
    [tasks, filter],
  );
  const scopeIds = list.map((t) => t.id);

  return (
    <View>
      <SectionTitle title="Skincare Shelves" subtitle="Tap steps in order. Each step is its own win." />
      <RoutineShelf routine="am" editable />
      <RoutineShelf routine="pm" editable />

      <SectionTitle
        title="Routine Builder"
        subtitle="Add, edit, reorder and schedule your tasks"
        right={
          <IconButton label="Add custom task" onPress={() => setModal({ open: true, task: null })} style={{ backgroundColor: colors.espresso }}>
            <Plus size={18} color={colors.oat} />
          </IconButton>
        }
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18 }}>
        <Pill testID="builder-custom" label={`💖 My custom (${tasks.filter((t) => t.custom).length})`} active={filter === 'custom'} onPress={() => setFilter('custom')} color={colors.peach} tint={colors.peachTint} />
        {categoryOrder.map((c) => (
          <Pill key={c} label={`${categoryMeta[c].emoji} ${categoryMeta[c].short}`} active={filter === c} color={categoryMeta[c].color} tint={categoryMeta[c].tint} onPress={() => setFilter(c)} />
        ))}
      </ScrollView>

      {list.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>{filter === 'custom' ? 'No custom tasks yet' : 'Nothing here yet'}</Text>
          <Text style={styles.emptySub}>Try “Hair wash & keratin mask” on Sun & Wed, or “Change bedsheets”.</Text>
          <Button testID="builder-add" label="Create a task" onPress={() => setModal({ open: true, task: null })} style={{ marginTop: 12, alignSelf: 'stretch' }} />
        </View>
      ) : (
        list.map((t, i) => (
          <View key={t.id} style={styles.row} testID={`builder-${t.id}`}>
            <View style={styles.rowTop}>
              <Text style={styles.emoji}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{t.title}</Text>
                <Text style={styles.meta}>
                  {timeOfDayMeta[t.timeOfDay].emoji} {t.timeOfDay === 'daytime' ? 'Daytime' : timeOfDayMeta[t.timeOfDay].label} · {tierLabel[t.tier]} · {daysLabel(t.days)}
                </Text>
              </View>
              <View style={styles.actions}>
                <IconButton label={`Move ${t.title} up`} onPress={() => moveTask(t.id, -1, scopeIds)} style={i === 0 ? styles.disabled : undefined}>
                  <ArrowUp size={15} color={colors.espresso} />
                </IconButton>
                <IconButton label={`Move ${t.title} down`} onPress={() => moveTask(t.id, 1, scopeIds)} style={i === list.length - 1 ? styles.disabled : undefined}>
                  <ArrowDown size={15} color={colors.espresso} />
                </IconButton>
                <IconButton label={`Edit ${t.title}`} onPress={() => setModal({ open: true, task: t })}>
                  <Pencil size={14} color={colors.espresso} />
                </IconButton>
              </View>
            </View>
            <View style={styles.days}>
              {ALL_DAYS.map((d) => {
                const on = t.days.includes(d);
                return (
                  <Pressable
                    key={d}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${t.title} on ${weekdayShort[d]}`}
                    onPress={() => {
                      winFeedback('tap');
                      toggleTaskDay(t.id, d);
                    }}
                    style={[styles.day, on && { backgroundColor: categoryMeta[t.category].color, borderColor: categoryMeta[t.category].color }]}
                  >
                    <Text style={[styles.dayText, on && { color: colors.espresso }]}>{weekdayShort[d]}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))
      )}

      <AddTaskModal visible={modal.open} task={modal.task} onClose={() => setModal({ open: false, task: null })} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.card, borderRadius: radius.md, padding: 12, marginBottom: 8, ...shadow, shadowOpacity: 0.04 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 22 },
  title: { fontSize: 14, fontWeight: '700', color: colors.espresso },
  meta: { fontSize: 11, color: colors.muted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 6 },
  disabled: { opacity: 0.35 },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  day: { width: 34, height: 30, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 12, fontWeight: '700', color: colors.espressoSoft },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: 24 },
  emptyEmoji: { fontSize: 34 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.espresso, marginTop: 6 },
  emptySub: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: 4 },
});
