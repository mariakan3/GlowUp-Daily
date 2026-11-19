import { Check, Lock, Plus, Trash2 } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { filterSuggestions, shelfSuggestions } from '../data/suggestions';
import { useToday } from '../lib/hooks';
import { isWeb, useNativeDriver, winFeedback } from '../lib/feedback';
import { isDone } from '../lib/wins';
import { useGlowStore } from '../store/useGlowStore';
import { colors, radius, shadow } from '../theme';
import type { RoutineId, RoutineStep } from '../types';
import { ReorderRow } from './ReorderRow';
import { SuggestionChips } from './SuggestionChips';
import { IconButton, ProgressBar } from './ui';

const shelfMeta: Record<RoutineId, { title: string; emoji: string; color: string; tint: string }> = {
  am: { title: 'AM Shelf', emoji: '🌤️', color: colors.butter, tint: colors.butterTint },
  pm: { title: 'PM Shelf', emoji: '🌙', color: colors.lilac, tint: colors.lilacTint },
};

function StepRow({
  step,
  index,
  position,
  total,
  done,
  locked,
  isNext,
  editing,
  color,
  tint,
  onReorder,
}: {
  step: RoutineStep;
  index: number;
  position: number;
  total: number;
  done: boolean;
  locked: boolean;
  isNext: boolean;
  editing: boolean;
  color: string;
  tint: string;
  onReorder: (from: number, to: number) => void;
}) {
  const toggle = useGlowStore((s) => s.toggleRoutineStep);
  const remove = useGlowStore((s) => s.removeRoutineStep);
  const update = useGlowStore((s) => s.updateRoutineStep);
  const pushToast = useGlowStore((s) => s.pushToast);
  const scale = useState(() => new Animated.Value(1))[0];
  const shake = useState(() => new Animated.Value(0))[0];
  const [title, setTitle] = useState(step.title);
  const [emoji, setEmoji] = useState(step.emoji);

  useEffect(() => {
    if (!editing) {
      setTitle(step.title);
      setEmoji(step.emoji);
    }
  }, [editing, step.title, step.emoji]);

  const onPress = () => {
    const result = toggle(step.id);
    if (result === 'locked') {
      winFeedback('undo');
      pushToast(done ? 'Undo later steps first' : `Step ${index}… finish the previous step first 💛`, 'info');
      Animated.sequence([-6, 6, -4, 4, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 45, useNativeDriver }))).start();
      return;
    }
    winFeedback(result === 'done' ? 'win' : 'undo');
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.95, duration: 70, useNativeDriver }),
      Animated.spring(scale, { toValue: result === 'done' ? (isWeb ? 1.05 : 1.03) : 1, useNativeDriver, speed: 40, bounciness: 18 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver, speed: 16 }),
    ]).start();
  };

  const changeTitle = (value: string) => {
    setTitle(value);
    if (value.trim()) update(step.id, { title: value });
  };
  const changeEmoji = (value: string) => {
    setEmoji(value);
    if (value.trim()) update(step.id, { emoji: value });
  };

  if (editing) {
    return (
      <ReorderRow
        index={position}
        count={total}
        onReorder={onReorder}
        testID={`shelf-${step.routine}-drag-${step.id}`}
        label={`Reorder ${step.title}`}
        style={[styles.step, { backgroundColor: tint }]}
      >
        <View style={[styles.stepNum, { backgroundColor: colors.cardSoft }]}>
          <Text style={styles.stepNumText}>{index}</Text>
        </View>
        <TextInput
          testID={`shelf-${step.routine}-emoji-${step.id}`}
          value={emoji}
          onChangeText={changeEmoji}
          onBlur={() => {
            if (!emoji.trim()) setEmoji(step.emoji);
          }}
          selectTextOnFocus
          maxLength={8}
          accessibilityLabel={`Emoji for ${step.title}`}
          style={styles.emojiInput}
        />
        <TextInput
          testID={`shelf-${step.routine}-title-${step.id}`}
          value={title}
          onChangeText={changeTitle}
          onBlur={() => {
            if (!title.trim()) setTitle(step.title);
          }}
          placeholder="Step name"
          placeholderTextColor={colors.muted}
          maxLength={200}
          accessibilityLabel={`Edit ${step.title}`}
          style={styles.titleInput}
        />
        <IconButton label={`Remove ${step.title}`} onPress={() => remove(step.id)}>
          <Trash2 size={15} color={colors.danger} />
        </IconButton>
      </ReorderRow>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale }, { translateX: shake }] }}>
      <ReorderRow
        index={position}
        count={total}
        onReorder={onReorder}
        testID={`shelf-${step.routine}-drag-${step.id}`}
        label={`Reorder ${step.title}`}
        style={[styles.step, done && { backgroundColor: tint }, isNext && { borderColor: color, borderWidth: 2 }]}
      >
      <Pressable style={styles.stepMain}
        testID={`step-${step.id}`}
        accessibilityRole="checkbox"
        aria-checked={done}
        accessibilityLabel={`Step ${index}: ${step.title}`}
        onPress={onPress}
      >
        <View style={[styles.stepNum, { backgroundColor: done ? color : colors.cardSoft }]}>
          {done ? <Check size={14} color={colors.espresso} strokeWidth={3} /> : <Text style={styles.stepNumText}>{index}</Text>}
        </View>
        <Text style={styles.stepEmoji}>{step.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stepTitle, done && styles.stepTitleDone]}>{step.title}</Text>
          {isNext ? <Text style={styles.nextHint}>Up next · +1 win</Text> : null}
        </View>
        {locked && !done ? <Lock size={15} color={colors.muted} /> : null}
      </Pressable>
      </ReorderRow>
    </Animated.View>
  );
}

export function RoutineShelf({ routine, editable }: { routine: RoutineId; editable?: boolean }) {
  const today = useToday();
  const allSteps = useGlowStore((s) => s.routineSteps);
  const events = useGlowStore((s) => s.events);
  const addRoutineStep = useGlowStore((s) => s.addRoutineStep);
  const reorderRoutineSteps = useGlowStore((s) => s.reorderRoutineSteps);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const meta = shelfMeta[routine];

  const steps = useMemo(() => allSteps.filter((s) => s.routine === routine).sort((a, b) => a.order - b.order), [allSteps, routine]);
  const done = steps.map((s) => isDone(events, today, 'routine', s.id));
  const doneCount = done.filter(Boolean).length;
  const nextIdx = done.findIndex((d) => !d);

  const add = () => {
    if (!draft.trim()) return;
    addRoutineStep(routine, draft.trim(), '✨');
    setDraft('');
  };
  const canAdd = editing || steps.length === 0;
  const ideas = filterSuggestions(shelfSuggestions[routine], draft, steps.map((st) => st.title), (sg) => sg.title, shelfSuggestions[routine].length);
  const addIdea = (title: string) => {
    const sg = shelfSuggestions[routine].find((x) => x.title === title);
    if (!sg) return;
    addRoutineStep(routine, sg.title, sg.emoji);
    setDraft('');
  };

  return (
    <View style={styles.shelf}>
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>{meta.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.sub}>
            {editing
              ? 'Drag a step to reorder, or rename it and add one below'
              : steps.length === 0
                ? 'Empty shelf. Add your steps in order'
                : doneCount === steps.length
                  ? 'Shelf complete, glowing ✨'
                  : `${doneCount}/${steps.length} steps · tap in order`}
          </Text>
        </View>
        {editable && steps.length > 0 ? (
          <Pressable testID={`shelf-${routine}-edit`} accessibilityRole="button" accessibilityLabel={editing ? `Done editing ${meta.title}` : `Edit ${meta.title}`} onPress={() => setEditing((e) => !e)} hitSlop={8}>
            <Text style={styles.edit}>{editing ? 'Done' : 'Edit'}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ marginBottom: 10 }}>
        <ProgressBar value={steps.length ? doneCount / steps.length : 0} color={meta.color} height={6} />
      </View>
      {steps.map((s, i) => (
        <StepRow
          key={s.id}
          step={s}
          index={i + 1}
          position={i}
          total={steps.length}
          onReorder={(from, to) => reorderRoutineSteps(routine, from, to)}
          done={done[i]}
          locked={nextIdx !== -1 && i > nextIdx}
          isNext={i === nextIdx}
          editing={editing}
          color={meta.color}
          tint={meta.tint}
        />
      ))}
      {canAdd ? (
        <>
          <View style={styles.addRow}>
            <TextInput
              testID={`shelf-${routine}-input`}
              value={draft}
              onChangeText={setDraft}
              placeholder={`Add step ${steps.length + 1}, e.g. ${routine === 'am' ? 'SPF 50' : 'Night cream'}`}
              placeholderTextColor={colors.muted}
              style={styles.addInput}
              onSubmitEditing={add}
            />
            <IconButton label={`Add ${routine.toUpperCase()} step`} onPress={add} style={{ backgroundColor: meta.color }}>
              <Plus size={18} color={colors.espresso} />
            </IconButton>
          </View>
          <SuggestionChips
            testID={`shelf-${routine}-suggestions`}
            title={`${routine.toUpperCase()} step ideas`}
            items={ideas.map((sg) => ({ key: sg.title, label: sg.title, emoji: sg.emoji }))}
            onPick={addIdea}
            emptyText={draft.trim() ? 'No match. Tap + to add your own.' : undefined}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, marginBottom: 12, ...shadow },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  headerEmoji: { fontSize: 26 },
  title: { fontSize: 17, fontWeight: '800', color: colors.espresso },
  sub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  edit: { fontSize: 14, fontWeight: '700', color: colors.matchaDeep },
  step: { gap: 8, paddingVertical: 8, paddingRight: 10, paddingLeft: 4, borderRadius: radius.md, marginBottom: 6, backgroundColor: colors.oat, borderWidth: 2, borderColor: 'transparent' },
  stepMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 12, fontWeight: '800', color: colors.espressoSoft },
  stepEmoji: { fontSize: 18 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: colors.espresso },
  stepTitleDone: { textDecorationLine: 'line-through', color: colors.espressoSoft },
  nextHint: { fontSize: 11, color: colors.matchaDeep, fontWeight: '700', marginTop: 1 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  addInput: { flex: 1, backgroundColor: colors.oat, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.espresso, borderWidth: 1, borderColor: colors.line },
  emojiInput: { width: 42, height: 40, borderRadius: radius.md, backgroundColor: colors.card, textAlign: 'center', fontSize: 18, color: colors.espresso, borderWidth: 1, borderColor: colors.line },
  titleInput: { flex: 1, minWidth: 0, backgroundColor: colors.card, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, fontWeight: '600', color: colors.espresso, borderWidth: 1, borderColor: colors.line },
});
