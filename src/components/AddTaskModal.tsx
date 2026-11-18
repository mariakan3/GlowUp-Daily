import { Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ALL_DAYS, weekdayShort } from '../lib/date';
import { winFeedback } from '../lib/feedback';
import { useGlowStore } from '../store/useGlowStore';
import { categoryMeta, categoryOrder, colors, radius, timeOfDayMeta, timeOfDayOrder } from '../theme';
import type { CategoryId, Task, TaskTier, TimeOfDay, Weekday } from '../types';
import { Sheet } from './Sheet';
import { Button, Pill, ui } from './ui';

const emojiChoices = ['✨', '🛁', '🧴', '💇‍♀️', '🛌', '🧺', '🍳', '🥤', '📖', '🧠', '💻', '🎾', '🧘‍♀️', '🏃‍♀️', '🌸', '🪴', '💌', '🕯️'];

const tierOptions: { value: TaskTier; label: string; hint: string }[] = [
  { value: 1, label: '🧸 Essential', hint: 'Shows even on Soft Days' },
  { value: 2, label: '🌿 Standard', hint: 'Balanced & High Era days' },
  { value: 3, label: '🚀 High Era', hint: 'Only on full-schedule days' },
];

export function AddTaskModal({ visible, onClose, task }: { visible: boolean; onClose: () => void; task?: Task | null }) {
  const addTask = useGlowStore((s) => s.addTask);
  const updateTask = useGlowStore((s) => s.updateTask);
  const deleteTask = useGlowStore((s) => s.deleteTask);
  const pushToast = useGlowStore((s) => s.pushToast);

  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [category, setCategory] = useState<CategoryId>('selfcare');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('evening');
  const [tier, setTier] = useState<TaskTier>(2);
  const [days, setDays] = useState<Weekday[]>(ALL_DAYS);

  useEffect(() => {
    if (!visible) return;
    setTitle(task?.title ?? '');
    setEmoji(task?.emoji ?? '✨');
    setCategory(task?.category ?? 'selfcare');
    setTimeOfDay(task?.timeOfDay ?? 'evening');
    setTier(task?.tier ?? 2);
    setDays(task?.days ?? ALL_DAYS);
  }, [visible, task]);

  const toggleDay = (d: Weekday) => setDays((prev) => (prev.includes(d) ? (prev.length > 1 ? prev.filter((x) => x !== d) : prev) : [...prev, d].sort()));

  const canSave = title.trim().length > 0;
  const save = () => {
    if (!canSave) return;
    const input = { title: title.trim(), emoji, category, timeOfDay, tier, days };
    if (task) {
      updateTask(task.id, input);
      pushToast('Task updated 💫', 'info');
    } else {
      addTask(input);
      pushToast('New win unlocked for your days ✨', 'info');
    }
    winFeedback('tap');
    onClose();
  };

  const remove = () => {
    if (!task) return;
    deleteTask(task.id);
    pushToast('Task removed', 'info');
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={task ? 'Edit task' : 'New micro-win'}
      subtitle={task ? 'Tweak it, reschedule it, make it yours' : 'Small actions, big momentum'}
      footer={
        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 8 }}>
          {task ? <Button label="Delete" variant="danger" onPress={remove} icon={<Trash2 size={16} color={colors.danger} />} /> : null}
          <Button testID="save-task" label={task ? 'Save changes' : 'Add task'} onPress={save} disabled={!canSave} style={{ flex: 1 }} />
        </View>
      }
    >
      <Text style={ui.label}>What's the win?</Text>
      <TextInput
        testID="task-title-input"
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Hair wash & keratin mask"
        placeholderTextColor={colors.muted}
        style={ui.input}
        onSubmitEditing={save}
        returnKeyType="done"
      />

      <Text style={ui.label}>Emoji</Text>
      <View style={styles.wrap}>
        {emojiChoices.map((e) => (
          <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && styles.emojiActive]} accessibilityLabel={`Emoji ${e}`}>
            <Text style={{ fontSize: 20 }}>{e}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={ui.label}>Category</Text>
      <View style={styles.wrap}>
        {categoryOrder.map((c) => (
          <Pill
            key={c}
            small
            label={`${categoryMeta[c].emoji} ${categoryMeta[c].short}`}
            active={category === c}
            color={categoryMeta[c].color}
            tint={categoryMeta[c].tint}
            onPress={() => setCategory(c)}
          />
        ))}
      </View>

      <Text style={ui.label}>Time of day</Text>
      <View style={styles.wrap}>
        {timeOfDayOrder.map((t) => (
          <Pill key={t} small label={`${timeOfDayMeta[t].emoji} ${t === 'daytime' ? 'Daytime' : timeOfDayMeta[t].label}`} active={timeOfDay === t} onPress={() => setTimeOfDay(t)} />
        ))}
      </View>

      <Text style={ui.label}>Energy level</Text>
      <View style={styles.wrap}>
        {tierOptions.map((t) => (
          <Pill key={t.value} small label={t.label} active={tier === t.value} color={colors.lilac} tint={colors.lilacTint} onPress={() => setTier(t.value)} />
        ))}
      </View>
      <Text style={ui.muted}>{tierOptions.find((t) => t.value === tier)?.hint}</Text>

      <Text style={ui.label}>Repeat on</Text>
      <View style={styles.days}>
        {ALL_DAYS.map((d) => {
          const on = days.includes(d);
          return (
            <Pressable
              key={d}
              onPress={() => toggleDay(d)}
              accessibilityRole="checkbox"
              aria-checked={on}
              style={[styles.day, on && { backgroundColor: colors.matcha, borderColor: colors.matcha }]}
            >
              <Text style={[styles.dayText, on && { color: colors.espresso }]}>{weekdayShort[d]}</Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  emoji: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.oat, marginRight: 6, marginBottom: 6, borderWidth: 2, borderColor: 'transparent' },
  emojiActive: { borderColor: colors.matcha, backgroundColor: colors.matchaTint },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 40, height: 40, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 14, fontWeight: '700', color: colors.espressoSoft },
});
