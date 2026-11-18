import { router } from 'expo-router';
import { ChevronDown, ChevronUp, Plus, Timer } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AddTaskModal } from '../components/AddTaskModal';
import { AIConciergeModal } from '../components/AIConciergeModal';
import { DopamineRouletteModal } from '../components/DopamineRouletteModal';
import { EnergyModeSelector } from '../components/EnergyModeSelector';
import { GlowProgressRing } from '../components/GlowProgressRing';
import { RoutineShelf } from '../components/RoutineShelf';
import { SuggestionChips } from '../components/SuggestionChips';
import { TaskCard } from '../components/TaskCard';
import { filterSuggestions, taskSuggestions } from '../data/suggestions';
import { Button, Card, Pill, Screen, SectionTitle } from '../components/ui';
import { fromDateKey, greetingFor } from '../lib/date';
import { useNativeDriver, winFeedback } from '../lib/feedback';
import { activeTasksFor } from '../lib/plan';
import { useTodayStats } from '../lib/hooks';
import { isDone, isTaskVisibleInMode } from '../lib/wins';
import { useGlowStore } from '../store/useGlowStore';
import { auraFor, auraLevels, categoryMeta, categoryOrder, colors, energyMeta, radius, shadow, timeOfDayMeta, timeOfDayOrder } from '../theme';
import type { CategoryId, Task, TimeOfDay } from '../types';

type Filter = 'all' | CategoryId;

function RemixHeroPill({ onPress }: { onPress: () => void }) {
  const [glow] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver }),
        Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [glow]);
  const opacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] });
  const scale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  return (
    <Pressable testID="ai-remix-open" accessibilityRole="button" onPress={onPress} style={{ flex: 1.35 }}>
      <Animated.View pointerEvents="none" style={[styles.heroGlow, { opacity, transform: [{ scale }] }]} />
      <View style={styles.heroPill}>
        <Text style={styles.heroText}>✨ AI Remix My Day</Text>
      </View>
    </Pressable>
  );
}

export function HomeScreen() {
  const { today, mode, target, wins, streak } = useTodayStats();
  const tasks = useGlowStore((s) => s.tasks);
  const events = useGlowStore((s) => s.events);
  const routineSteps = useGlowStore((s) => s.routineSteps);
  const userName = useGlowStore((s) => s.userName);
  const toggleTask = useGlowStore((s) => s.toggleTask);
  const addTask = useGlowStore((s) => s.addTask);
  const pushToast = useGlowStore((s) => s.pushToast);
  const dayPlan = useGlowStore((s) => s.dayPlan);
  const snapshot = useGlowStore((s) => s.previousTasksSnapshot);
  const profile = useGlowStore((s) => s.aiScheduleProfile);
  const revertAIRemix = useGlowStore((s) => s.revertAIRemix);
  const splitTask = useGlowStore((s) => s.splitTaskIntoMicroWins);
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);

  const [filter, setFilter] = useState<Filter>('all');
  const [showAll, setShowAll] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<TimeOfDay, boolean>>({ morning: false, daytime: false, evening: false });
  const [modal, setModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null });

  const aura = auraFor(wins);
  const nextAura = auraLevels.find((l) => l.min > wins);
  const scheduled = useMemo(() => activeTasksFor(tasks, dayPlan, today), [tasks, dayPlan, today]);
  const remixedToday = profile?.date === today && dayPlan?.date === today;
  const canUndo = snapshot?.date === today;
  const hiddenByMode = scheduled.filter((t) => !isTaskVisibleInMode(t, mode)).length;
  const visible = scheduled.filter((t) => (showAll || isTaskVisibleInMode(t, mode)) && (filter === 'all' || t.category === filter));
  const showShelves = filter === 'all' || filter === 'selfcare';

  const shelfDone = (routine: 'am' | 'pm') => {
    const steps = routineSteps.filter((r) => r.routine === routine);
    return { done: steps.filter((r) => isDone(events, today, 'routine', r.id)).length, total: steps.length };
  };

  const dateLabel = fromDateKey(today).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.date}>{dateLabel}</Text>
            <Text style={styles.greeting}>
              {greetingFor()}{userName ? `, ${userName}` : ''} ✨
            </Text>
          </View>
          <View style={styles.streak} accessibilityLabel={`${streak} day streak`}>
            <Text style={styles.streakText}>🔥 {streak} Day Streak</Text>
          </View>
        </View>

        <View style={styles.heroRow}>
          <RemixHeroPill onPress={() => setConciergeOpen(true)} />
          <Pressable
            testID="quick-win-open"
            accessibilityRole="button"
            onPress={() => {
              winFeedback('tap');
              setRouletteOpen(true);
            }}
            style={({ pressed }) => [styles.quickWin, pressed && { transform: [{ scale: 0.97 }] }]}
          >
            <Text style={styles.quickWinText}>🎲 Need a Quick Win?</Text>
          </Pressable>
        </View>

        {remixedToday || canUndo ? (
          <View style={styles.remixBanner} testID="remix-banner">
            <Text style={styles.remixText} numberOfLines={3}>
              {remixedToday && profile ? `${profile.summary}${profile.fallbackReason ? ' (Smart Rules backup)' : ''}` : 'Your previous day plan is ready to restore.'}
            </Text>
            {canUndo ? (
              <Pressable testID="undo-remix" accessibilityRole="button" onPress={() => { winFeedback('undo'); revertAIRemix(); }} style={styles.undoPill}>
                <Text style={styles.undoText}>↩️ Undo AI Remix</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Card style={styles.ringCard}>
          <GlowProgressRing progress={wins / target} color={aura.color} secondaryColor={wins >= target ? colors.matcha : aura.color} glow={aura.glow} pulseKey={wins} size={210}>
            <Text style={styles.ringLabel}>Today’s Wins</Text>
            <Text style={styles.ringCount} testID="win-count">
              {wins}
              <Text style={styles.ringTarget}> / {target}</Text>
            </Text>
            <View style={[styles.auraChip, { backgroundColor: aura.glow, borderColor: aura.color }]}>
              <Text style={styles.auraText}>{aura.name}</Text>
            </View>
          </GlowProgressRing>
          <Text style={styles.ringHint}>
            {wins >= target
              ? `Target smashed! ${energyMeta[mode].emoji} Every extra win is a bonus.`
              : `${target - wins} more ${target - wins === 1 ? 'win' : 'wins'} to hit your ${energyMeta[mode].short} goal`}
            {nextAura ? ` · ${nextAura.min - wins} to ${nextAura.name}` : ''}
          </Text>
          <View style={styles.auraScale}>
            {auraLevels.slice(1).map((l) => (
              <View key={l.name} style={styles.auraStep}>
                <View style={[styles.auraDot, { backgroundColor: wins >= l.min ? l.color : colors.cardSoft }]} />
                <Text style={[styles.auraStepText, wins >= l.min && { color: colors.espresso }]} numberOfLines={1}>
                  {l.name === 'Unstoppable Queen' ? 'Queen 👑' : l.name}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        <SectionTitle title="Energy Mode" subtitle="How much do you have in the tank today?" />
        <EnergyModeSelector mode={mode} />

        <Pressable onPress={() => router.navigate('/focus')} style={styles.focusCta} accessibilityRole="button">
          <View style={styles.focusIcon}>
            <Timer size={20} color={colors.espresso} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.focusTitle}>Start a Focus Sprint</Text>
            <Text style={styles.focusSub}>Each completed block = +2 wins</Text>
          </View>
          <Text style={styles.focusBadge}>+2</Text>
        </Pressable>

        <SectionTitle title="Today's Rituals" subtitle="One tap = one win" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18 }}>
          <Pill label="✨ All" active={filter === 'all'} onPress={() => setFilter('all')} color={colors.espresso} tint={colors.cardSoft} testID="filter-all" />
          {categoryOrder.map((c) => (
            <Pill
              key={c}
              testID={`filter-${c}`}
              label={`${categoryMeta[c].emoji} ${categoryMeta[c].short}`}
              active={filter === c}
              color={categoryMeta[c].color}
              tint={categoryMeta[c].tint}
              onPress={() => setFilter(c)}
            />
          ))}
        </ScrollView>

        {tasks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎨</Text>
            <Text style={styles.emptyTitle}>Your day is a blank canvas</Text>
            <Text style={styles.emptyText}>Add the little things you already do. Every one becomes a win you can tap.</Text>
            <SuggestionChips
              testID="today-quick-add"
              title="Tap to add"
              items={filterSuggestions(
                categoryOrder.flatMap((c) => taskSuggestions.filter((t) => t.category === c).slice(0, 2)),
                '',
                tasks.map((t) => t.title),
                (t) => t.title,
                10,
              ).map((t) => ({ key: t.title, label: t.title, emoji: t.emoji }))}
              onPick={(title) => {
                const sg = taskSuggestions.find((t) => t.title === title);
                if (!sg) return;
                const { title: tt, emoji, category, timeOfDay, tier, days, sport, minutes } = sg;
                addTask({ title: tt, emoji, category, timeOfDay, tier, days, sport, minutes });
                pushToast(`Added “${tt}” ✨`, 'info');
              }}
            />
            <Button testID="empty-create-task" label="Create my own win" icon={<Plus size={16} color={colors.oat} />} onPress={() => setModal({ open: true, task: null })} style={{ marginTop: 16, alignSelf: 'stretch' }} />
          </Card>
        ) : !scheduled.length ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🌙</Text>
            <Text style={styles.emptyTitle}>Nothing scheduled today</Text>
            <Text style={styles.emptyText}>Your routines rest today. Add a one-off win or adjust days in Routines.</Text>
          </Card>
        ) : null}
        {hiddenByMode > 0 ? (
          <Pressable onPress={() => setShowAll((v) => !v)} style={[styles.modeNote, { backgroundColor: energyMeta[mode].tint }]}>
            <Text style={styles.modeNoteText}>
              {showAll
                ? `Showing everything. Extras beyond ${energyMeta[mode].short} are optional bonus wins.`
                : `${energyMeta[mode].emoji} ${energyMeta[mode].short}: ${hiddenByMode} optional task${hiddenByMode === 1 ? '' : 's'} tucked away.`}
            </Text>
            <Text style={styles.modeNoteLink}>{showAll ? 'Hide extras' : 'Show all'}</Text>
          </Pressable>
        ) : null}

        {timeOfDayOrder.map((tod) => {
          const group = visible.filter((t) => t.timeOfDay === tod);
          const shelf = tod === 'morning' ? 'am' : tod === 'evening' ? 'pm' : null;
          const includeShelf = !!shelf && showShelves && (shelf === 'am' || mode !== 'soft' || showAll);
          if (!group.length && !includeShelf) return null;
          const groupDone = group.filter((t) => isDone(events, today, 'task', t.id)).length;
          const sd = includeShelf && shelf ? shelfDone(shelf) : { done: 0, total: 0 };
          const meta = timeOfDayMeta[tod];
          const isCollapsed = collapsed[tod];
          return (
            <View key={tod} style={styles.group}>
              <Pressable
                style={styles.groupHeader}
                onPress={() => setCollapsed((c) => ({ ...c, [tod]: !c[tod] }))}
                accessibilityRole="button"
                aria-expanded={!isCollapsed}
              >
                <Text style={styles.groupEmoji}>{meta.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupTitle}>{meta.label}</Text>
                  <Text style={styles.groupSub}>
                    {groupDone + sd.done}/{group.length + sd.total} wins · {meta.hint}
                  </Text>
                </View>
                {isCollapsed ? <ChevronDown size={20} color={colors.espressoSoft} /> : <ChevronUp size={20} color={colors.espressoSoft} />}
              </Pressable>
              {!isCollapsed ? (
                <View style={{ marginTop: 10 }}>
                  {includeShelf && shelf === 'am' ? <RoutineShelf routine="am" /> : null}
                  {group.map((t) => (
                    <TaskCard
                      key={t.id}
                      testID={`task-${t.id}`}
                      title={t.title}
                      emoji={t.emoji}
                      category={t.category}
                      done={isDone(events, today, 'task', t.id)}
                      onToggle={() => toggleTask(t.id)}
                      onLongPress={() => setModal({ open: true, task: t })}
                      meta={t.remixNote ?? `${categoryMeta[t.category].emoji} ${categoryMeta[t.category].short}${t.tier === 1 ? ' · Essential' : ''}`}
                      winLabel={`+${t.wins ?? 1}`}
                      onSplit={t.splitFrom ? undefined : () => splitTask(t.id)}
                      dimmed={!isTaskVisibleInMode(t, mode)}
                    />
                  ))}
                  {includeShelf && shelf === 'pm' ? <RoutineShelf routine="pm" /> : null}
                </View>
              ) : null}
            </View>
          );
        })}

        {tasks.length > 0 && scheduled.length > 0 && !visible.length && !showShelves ? (
          <Card>
            <Text style={styles.empty}>Nothing in this category today. Add one with the + button.</Text>
          </Card>
        ) : null}
        {tasks.length > 0 ? <Text style={styles.tip}>Tip: long-press any task to edit it.</Text> : null}
      </Screen>

      <Pressable testID="add-task-fab" style={styles.fab} onPress={() => setModal({ open: true, task: null })} accessibilityRole="button" accessibilityLabel="Add task">
        <Plus size={26} color={colors.oat} />
      </Pressable>

      <AddTaskModal visible={modal.open} task={modal.task} onClose={() => setModal({ open: false, task: null })} />
      <AIConciergeModal visible={conciergeOpen} onClose={() => setConciergeOpen(false)} />
      <DopamineRouletteModal visible={rouletteOpen} onClose={() => setRouletteOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 16 },
  date: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.espresso, letterSpacing: -0.5, marginTop: 2 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.peachTint, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill },
  streakText: { fontSize: 13, fontWeight: '800', color: colors.espresso },
  heroRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.pill, backgroundColor: colors.lilac },
  heroPill: { borderRadius: radius.pill, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.espresso, margin: 3 },
  heroText: { fontSize: 15, fontWeight: '800', color: colors.oat },
  quickWin: { flex: 1, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.butterTint, borderWidth: 1.5, borderColor: colors.butter, marginVertical: 3 },
  quickWinText: { fontSize: 13, fontWeight: '800', color: colors.espresso },
  remixBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.lilacTint, borderRadius: radius.md, padding: 12, marginBottom: 12 },
  remixText: { flex: 1, fontSize: 12, color: colors.espresso, fontWeight: '600' },
  undoPill: { backgroundColor: colors.card, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  undoText: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  ringCard: { alignItems: 'center', paddingVertical: 24 },
  ringLabel: { fontSize: 13, color: colors.muted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  ringCount: { fontSize: 54, fontWeight: '900', color: colors.espresso, letterSpacing: -2 },
  ringTarget: { fontSize: 24, fontWeight: '700', color: colors.muted, letterSpacing: 0 },
  auraChip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1.5, marginTop: 2 },
  auraText: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  ringHint: { fontSize: 13, color: colors.espressoSoft, marginTop: 20, textAlign: 'center', fontWeight: '500' },
  auraScale: { flexDirection: 'row', marginTop: 14, gap: 6, width: '100%' },
  auraStep: { flex: 1, alignItems: 'center' },
  auraDot: { width: '100%', height: 6, borderRadius: 3 },
  auraStepText: { fontSize: 10, color: colors.muted, fontWeight: '700', marginTop: 4 },
  focusCta: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.lilacTint, borderRadius: radius.lg, padding: 14, marginTop: 16 },
  focusIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.lilac, alignItems: 'center', justifyContent: 'center' },
  focusTitle: { fontSize: 15, fontWeight: '800', color: colors.espresso },
  focusSub: { fontSize: 12, color: colors.espressoSoft, marginTop: 1 },
  focusBadge: { fontSize: 14, fontWeight: '900', color: colors.espresso, backgroundColor: colors.card, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, overflow: 'hidden' },
  modeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, padding: 12, marginTop: 4 },
  modeNoteText: { flex: 1, fontSize: 13, color: colors.espresso },
  modeNoteLink: { fontSize: 13, fontWeight: '800', color: colors.matchaDeep },
  group: { marginTop: 18 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.cardSoft, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14 },
  groupEmoji: { fontSize: 22 },
  groupTitle: { fontSize: 16, fontWeight: '800', color: colors.espresso },
  groupSub: { fontSize: 12, color: colors.espressoSoft, marginTop: 1 },
  empty: { color: colors.espressoSoft, textAlign: 'center' },
  emptyCard: { alignItems: 'center', marginTop: 18, paddingVertical: 22 },
  emptyEmoji: { fontSize: 36 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.espresso, marginTop: 6 },
  emptyText: { fontSize: 13, color: colors.espressoSoft, textAlign: 'center', marginTop: 4, marginBottom: 4 },
  tip: { textAlign: 'center', fontSize: 12, color: colors.muted, marginTop: 18 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.espresso, alignItems: 'center', justifyContent: 'center', ...shadow, shadowOpacity: 0.25 },
});
