import { Minus, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useGlowStore } from '../store/useGlowStore';
import { categoryMeta, categoryOrder, colors } from '../theme';
import type { CategoryId, Goal } from '../types';
import { Sheet } from './Sheet';
import { Button, IconButton, Pill, ui } from './ui';

const goalEmojis = ['🎯', '🎓', '🏃‍♀️', '🎾', '🍳', '🫧', '💼', '💸', '📖', '🧘‍♀️', '✈️', '🌱'];
const MIN_STEPS = 3;
const MAX_STEPS = 5;

type Props = { visible: boolean; onClose: () => void; goal?: Goal | null };

export function AddGoalModal(props: Props) {
  if (!props.visible) return null;
  return <AddGoalForm key={props.goal?.id ?? 'new'} {...props} />;
}

function AddGoalForm({ visible, onClose, goal }: Props) {
  const addGoal = useGlowStore((s) => s.addGoal);
  const updateGoal = useGlowStore((s) => s.updateGoal);
  const deleteGoal = useGlowStore((s) => s.deleteGoal);
  const pushToast = useGlowStore((s) => s.pushToast);
  const [title, setTitle] = useState(goal?.title ?? '');
  const [emoji, setEmoji] = useState(goal?.emoji ?? '🎯');
  const [category, setCategory] = useState<CategoryId>(goal?.category ?? 'studies');
  const [steps, setSteps] = useState<string[]>(() => {
    const existing = goal?.milestones.map((m) => m.title) ?? [];
    return [...existing, ...Array<string>(Math.max(0, MIN_STEPS - existing.length)).fill('')];
  });

  const filled = steps.filter((s) => s.trim()).length;
  const canSave = title.trim().length > 0 && filled >= MIN_STEPS;

  const save = () => {
    if (!canSave) return;
    const input = { title, emoji, category, milestones: steps };
    if (goal) updateGoal(goal.id, input);
    else addGoal(input);
    pushToast(goal ? 'Goal updated 🎯' : 'New big goal on the ladder 🪜', 'info');
    onClose();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={goal ? 'Edit goal' : 'New big goal'}
      subtitle="Break it into 3–5 milestones. Each one is a +3 Super Win."
      footer={
        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 8 }}>
          {goal ? (
            <Button
              label="Delete"
              variant="danger"
              icon={<Trash2 size={16} color={colors.danger} />}
              onPress={() => {
                deleteGoal(goal.id);
                onClose();
              }}
            />
          ) : null}
          <Button testID="save-goal" label={goal ? 'Save goal' : 'Add goal'} onPress={save} disabled={!canSave} style={{ flex: 1 }} />
        </View>
      }
    >
      <Text style={ui.label}>Goal</Text>
      <TextInput testID="goal-title-input" value={title} onChangeText={setTitle} placeholder="e.g. Run 5K under 28m" placeholderTextColor={colors.muted} style={ui.input} />

      <Text style={ui.label}>Emoji</Text>
      <View style={styles.wrap}>
        {goalEmojis.map((e) => (
          <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && styles.emojiActive]}>
            <Text style={{ fontSize: 20 }}>{e}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={ui.label}>Category</Text>
      <View style={styles.wrap}>
        {categoryOrder.map((c) => (
          <Pill key={c} small label={`${categoryMeta[c].emoji} ${categoryMeta[c].short}`} active={category === c} color={categoryMeta[c].color} tint={categoryMeta[c].tint} onPress={() => setCategory(c)} />
        ))}
      </View>

      <Text style={ui.label}>Milestones ({filled}/{MAX_STEPS})</Text>
      {steps.map((s, i) => (
        <View key={i} style={styles.stepRow}>
          <Text style={styles.stepNum}>{i + 1}</Text>
          <TextInput
            testID={`milestone-input-${i}`}
            value={s}
            onChangeText={(v) => setSteps((prev) => prev.map((p, j) => (j === i ? v : p)))}
            placeholder={i === 0 ? 'First tiny step' : 'Next step'}
            placeholderTextColor={colors.muted}
            style={[ui.input, { flex: 1 }]}
          />
          {steps.length > MIN_STEPS ? (
            <IconButton label="Remove milestone" onPress={() => setSteps((prev) => prev.filter((_, j) => j !== i))}>
              <Minus size={15} color={colors.espresso} />
            </IconButton>
          ) : null}
        </View>
      ))}
      {steps.length < MAX_STEPS ? <Button label="Add milestone" variant="soft" icon={<Plus size={16} color={colors.espresso} />} onPress={() => setSteps((p) => [...p, ''])} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  emoji: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.oat, marginRight: 6, marginBottom: 6, borderWidth: 2, borderColor: 'transparent' },
  emojiActive: { borderColor: colors.lilac, backgroundColor: colors.lilacTint },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  stepNum: { width: 20, fontWeight: '800', color: colors.muted, textAlign: 'center' },
});
