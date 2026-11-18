import { Pause, Play, Plus, RotateCcw, SkipForward } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlowProgressRing } from '../components/GlowProgressRing';
import { Button, Card, IconButton, Pill, ProgressBar, SectionTitle, ui } from '../components/ui';
import { focusPresets } from '../data/seed';
import { formatClock, formatDuration, lastSevenDays, weekdayLabel, weekdayOf } from '../lib/date';
import { winFeedback } from '../lib/feedback';
import { useNow, useToday } from '../lib/hooks';
import { presetById, useGlowStore } from '../store/useGlowStore';
import { colors, radius } from '../theme';

export function StudyScreen() {
  const today = useToday();
  const timer = useGlowStore((s) => s.timer);
  const subjects = useGlowStore((s) => s.subjects);
  const sessions = useGlowStore((s) => s.focusSessions);
  const { setTimerPreset, setTimerSubject, addSubject, startTimer, pauseTimer, resumeTimer, resetTimer, finishTimerPhase } = useGlowStore.getState();
  const [newSubject, setNewSubject] = useState('');
  const [adding, setAdding] = useState(false);

  const running = timer.endsAt !== null;
  const now = useNow(running);
  const remaining = timer.phase === 'idle' ? timer.phaseDurationSec : running ? Math.max(0, (timer.endsAt! - now) / 1000) : (timer.pausedRemaining ?? 0);
  const progress = timer.phase === 'idle' ? 0 : 1 - remaining / timer.phaseDurationSec;
  const preset = presetById(timer.presetId);
  const isBreak = timer.phase === 'break';

  const week = useMemo(() => lastSevenDays(today), [today]);
  const weekSessions = sessions.filter((s) => week.includes(s.date));
  const weekMinutes = weekSessions.reduce((a, s) => a + s.minutes, 0);
  const todayMinutes = sessions.filter((s) => s.date === today).reduce((a, s) => a + s.minutes, 0);
  const perDay = week.map((d) => sessions.filter((s) => s.date === d).reduce((a, s) => a + s.minutes, 0));
  const maxDay = Math.max(60, ...perDay);
  const bySubject = Object.entries(
    weekSessions.reduce<Record<string, number>>((acc, s) => ({ ...acc, [s.subject]: (acc[s.subject] ?? 0) + s.minutes }), {}),
  ).sort((a, b) => b[1] - a[1]);
  const recent = [...sessions].sort((a, b) => b.ts - a.ts).slice(0, 4);

  const submitSubject = () => {
    addSubject(newSubject);
    setNewSubject('');
    setAdding(false);
  };

  return (
    <View>
      <Card style={{ alignItems: 'center', paddingVertical: 22 }}>
        <Text style={styles.phaseLabel}>{timer.phase === 'idle' ? 'Ready when you are' : isBreak ? '🌿 Break time' : `📚 Focusing on ${timer.subject}`}</Text>
        <GlowProgressRing progress={progress} size={200} stroke={14} color={isBreak ? colors.matcha : colors.lilac} secondaryColor={isBreak ? colors.matcha : colors.peach} glow={isBreak ? colors.matchaTint : colors.lilacTint}>
          <Text style={styles.clock} testID="focus-clock">
            {formatClock(remaining)}
          </Text>
          <Text style={styles.clockSub}>
            {preset.emoji} {preset.name} · {isBreak ? `${preset.breakMin}m break` : `${preset.focusMin}m focus`}
          </Text>
        </GlowProgressRing>
        <View style={styles.controls}>
          {timer.phase === 'idle' ? (
            <Button
              testID="focus-start"
              label="Start sprint"
              icon={<Play size={16} color={colors.oat} fill={colors.oat} />}
              onPress={() => {
                winFeedback('tap');
                startTimer();
              }}
              style={{ flex: 1 }}
            />
          ) : (
            <>
              <IconButton label="Reset" onPress={resetTimer} style={styles.ctrlSmall}>
                <RotateCcw size={18} color={colors.espresso} />
              </IconButton>
              {running ? (
                <Button label="Pause" icon={<Pause size={16} color={colors.oat} />} onPress={pauseTimer} style={{ flex: 1 }} />
              ) : (
                <Button label="Resume" icon={<Play size={16} color={colors.oat} />} onPress={resumeTimer} style={{ flex: 1 }} />
              )}
              {isBreak ? (
                <IconButton label="Skip break" onPress={finishTimerPhase} style={styles.ctrlSmall}>
                  <SkipForward size={18} color={colors.espresso} />
                </IconButton>
              ) : null}
            </>
          )}
        </View>
        <Text style={styles.reward}>{isBreak ? 'Stretch, sip water, look out a window.' : 'Finish the block to earn +2 wins ✨'}</Text>
      </Card>

      <Text style={ui.label}>Sprint style</Text>
      <View style={styles.wrap}>
        {focusPresets.map((p) => (
          <Pill
            key={p.id}
            testID={`preset-${p.id}`}
            label={`${p.emoji} ${p.name} ${p.focusMin}/${p.breakMin}`}
            active={timer.presetId === p.id}
            color={colors.lilac}
            tint={colors.lilacTint}
            onPress={() => setTimerPreset(p.id)}
          />
        ))}
      </View>

      <Text style={ui.label}>Subject or project</Text>
      <View style={styles.wrap}>
        {subjects.map((s) => (
          <Pill key={s} label={s} active={timer.subject === s} color={colors.butter} tint={colors.butterTint} onPress={() => setTimerSubject(s)} />
        ))}
        {!adding ? <Pill label="+ New tag" onPress={() => setAdding(true)} color={colors.cardSoft} tint={colors.cardSoft} /> : null}
      </View>
      {adding ? (
        <View style={styles.addRow}>
          <TextInput autoFocus value={newSubject} onChangeText={setNewSubject} placeholder="e.g. Microeconomics" placeholderTextColor={colors.muted} style={[ui.input, { flex: 1 }]} onSubmitEditing={submitSubject} />
          <IconButton label="Add subject" onPress={submitSubject} style={{ backgroundColor: colors.butter, width: 44, height: 44, borderRadius: 22 }}>
            <Plus size={18} color={colors.espresso} />
          </IconButton>
        </View>
      ) : null}
      {timer.phase !== 'idle' ? <Text style={ui.muted}>Subject and style lock while a sprint is running.</Text> : null}

      <SectionTitle title="Study minutes" subtitle="Last 7 days" />
      <Card>
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{formatDuration(weekMinutes)}</Text>
            <Text style={ui.muted}>this week</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{formatDuration(todayMinutes)}</Text>
            <Text style={ui.muted}>today</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNum}>{weekSessions.length}</Text>
            <Text style={ui.muted}>blocks</Text>
          </View>
        </View>
        <View style={styles.bars}>
          {week.map((d, i) => (
            <View key={d} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { height: `${(perDay[i] / maxDay) * 100}%`, backgroundColor: d === today ? colors.peach : colors.lilac }]} />
              </View>
              <Text style={styles.barLabel}>{weekdayLabel[weekdayOf(d)][0]}</Text>
            </View>
          ))}
        </View>
        {bySubject.map(([subject, min]) => (
          <View key={subject} style={{ marginTop: 10 }}>
            <View style={styles.subjectRow}>
              <Text style={styles.subject}>{subject}</Text>
              <Text style={ui.muted}>{formatDuration(min)}</Text>
            </View>
            <ProgressBar value={min / Math.max(1, weekMinutes)} color={colors.butter} height={6} />
          </View>
        ))}
      </Card>

      {recent.length ? (
        <>
          <SectionTitle title="Recent blocks" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 10 }}>
            {recent.map((s) => (
              <View key={s.id} style={styles.recent}>
                <Text style={styles.recentEmoji}>{presetById(s.presetId).emoji}</Text>
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {s.subject}
                </Text>
                <Text style={ui.muted}>
                  {s.minutes}m · {s.date === today ? 'today' : weekdayLabel[weekdayOf(s.date)]}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  phaseLabel: { fontSize: 14, fontWeight: '700', color: colors.espressoSoft, marginBottom: 16 },
  clock: { fontSize: 46, fontWeight: '900', color: colors.espresso, letterSpacing: -1, fontVariant: ['tabular-nums'] },
  clockSub: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, width: '100%' },
  ctrlSmall: { width: 48, height: 48, borderRadius: 24 },
  reward: { fontSize: 12, color: colors.muted, marginTop: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statRow: { flexDirection: 'row' },
  stat: { flex: 1 },
  statNum: { fontSize: 22, fontWeight: '900', color: colors.espresso },
  bars: { flexDirection: 'row', gap: 8, height: 100, marginTop: 16, marginBottom: 6 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { flex: 1, width: '100%', backgroundColor: colors.cardSoft, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 8 },
  barLabel: { fontSize: 11, color: colors.muted, marginTop: 4, fontWeight: '700' },
  subjectRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  subject: { fontSize: 13, fontWeight: '700', color: colors.espresso },
  recent: { backgroundColor: colors.card, borderRadius: radius.md, padding: 12, width: 140 },
  recentEmoji: { fontSize: 20 },
  recentTitle: { fontSize: 14, fontWeight: '700', color: colors.espresso, marginTop: 6 },
});
