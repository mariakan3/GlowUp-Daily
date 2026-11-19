import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { AccountCard } from '../components/AccountCard';
import { Card, H1, Screen, SectionTitle, ui } from '../components/ui';
import { addDays, formatDuration, lastSevenDays, weekdayLabel, weekdayOf } from '../lib/date';
import { useToday } from '../lib/hooks';
import { bestStreak, categoryTotals, computeStreak, modeOn, targetOn, winsByDate } from '../lib/wins';
import { useGlowStore } from '../store/useGlowStore';
import { categoryMeta, categoryOrder, colors, energyMeta, radius, sportMeta } from '../theme';

function Donut({ values, size = 150, stroke = 22 }: { values: { value: number; color: string }[]; size?: number; stroke?: number }) {
  const total = values.reduce((a, v) => a + v.value, 0);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <Svg width={size} height={size}>
      <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.cardSoft} strokeWidth={stroke} fill="none" />
        {total > 0
          ? values.map((v, i) => {
              const len = (v.value / total) * c;
              const el = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={v.color}
                  strokeWidth={stroke}
                  fill="none"
                  strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })
          : null}
      </G>
    </Svg>
  );
}

export function InsightsScreen() {
  const today = useToday();
  const events = useGlowStore((s) => s.events);
  const dayModes = useGlowStore((s) => s.dayModes);
  const templates = useGlowStore((s) => s.tasks);
  const dayPlan = useGlowStore((s) => s.dayPlan);
  const tasks = useMemo(() => [...templates, ...(dayPlan?.tasks.filter((t) => !templates.some((x) => x.id === t.id)) ?? [])], [templates, dayPlan]);
  const focusSessions = useGlowStore((s) => s.focusSessions);
  const movementSessions = useGlowStore((s) => s.movementSessions);
  const goals = useGlowStore((s) => s.goals);

  const week = useMemo(() => lastSevenDays(today), [today]);
  const prevWeek = useMemo(() => lastSevenDays(addDays(today, -7)), [today]);
  const byDate = useMemo(() => winsByDate(events), [events]);
  const weekTotal = week.reduce((a, d) => a + (byDate[d] ?? 0), 0);
  const prevTotal = prevWeek.reduce((a, d) => a + (byDate[d] ?? 0), 0);
  const delta = weekTotal - prevTotal;
  const daysHit = week.filter((d) => (byDate[d] ?? 0) >= targetOn(dayModes, d)).length;
  const streak = computeStreak(events, dayModes, today);
  const best = bestStreak(events, dayModes, today);
  const maxDay = Math.max(20, ...week.map((d) => byDate[d] ?? 0));
  const bestDay = week.reduce((b, d) => ((byDate[d] ?? 0) > (byDate[b] ?? 0) ? d : b), week[0]);

  const cats = categoryTotals(events, week);
  const catTotal = categoryOrder.reduce((a, c) => a + cats[c], 0);
  const topCat = [...categoryOrder].sort((a, b) => cats[b] - cats[a])[0];

  const matrix = useMemo(() => {
    const weekSet = new Set(week);
    const counts: Record<string, number> = {};
    for (const e of events) if (e.source === 'task' && weekSet.has(e.date)) counts[e.refId] = (counts[e.refId] ?? 0) + 1;
    return tasks
      .filter((t) => counts[t.id])
      .sort((a, b) => counts[b.id] - counts[a.id] || a.order - b.order)
      .slice(0, 8)
      .map((t) => ({ task: t, count: counts[t.id], cells: week.map((d) => events.some((e) => e.date === d && e.source === 'task' && e.refId === t.id)) }));
  }, [events, tasks, week]);

  const focusMin = focusSessions.filter((s) => week.includes(s.date)).reduce((a, s) => a + s.minutes, 0);
  const moveWeek = movementSessions.filter((s) => week.includes(s.date));
  const moveMin = moveWeek.reduce((a, s) => a + s.minutes, 0);
  const sportsTried = new Set(moveWeek.map((s) => s.sport)).size;
  const msWeek = events.filter((e) => e.source === 'milestone' && week.includes(e.date)).length;
  const maxEver = Math.max(0, ...Object.values(byDate));
  const softSaves = week.filter((d) => modeOn(dayModes, d) === 'soft' && (byDate[d] ?? 0) >= energyMeta.soft.target).length;
  const goalsDone = goals.filter((g) => g.milestones.length && g.milestones.every((m) => m.doneAt)).length;

  const trophies = [
    { emoji: '👑', title: 'Unstoppable Queen', desc: 'Hit 20 wins in a single day', unlocked: maxEver >= 20 },
    { emoji: '🔥', title: 'Week on Fire', desc: '7-day streak', unlocked: best >= 7 },
    { emoji: '📚', title: 'Deep Worker', desc: '5h of focus in 7 days', unlocked: focusMin >= 300 },
    { emoji: '🎾', title: 'Movement Mix', desc: '3+ different sports this week', unlocked: sportsTried >= 3 },
    { emoji: '🧸', title: 'Soft Power', desc: 'Protected your streak on a Soft Day', unlocked: softSaves > 0 },
    { emoji: '🌟', title: 'Super Winner', desc: 'Reached a milestone this week', unlocked: msWeek > 0 },
    { emoji: '🏆', title: 'Goal Getter', desc: 'Finished every milestone of a goal', unlocked: goalsDone > 0 },
  ];

  return (
    <Screen>
      <H1 style={{ marginTop: 8 }}>Trophy Room 🏆</H1>
      <Text style={[ui.muted, { marginTop: 2 }]}>Your last 7 days, in glowing detail</Text>

      <Card style={styles.score}>
        <Text style={styles.scoreNum} testID="week-wins">
          {weekTotal}
        </Text>
        <Text style={styles.scoreLabel}>Wins this week!</Text>
        <Text style={styles.scoreDelta}>
          {weekTotal === 0 && prevTotal === 0
            ? 'Every win you tick lands here. Your trophy shelf is waiting 🏆'
            : delta >= 0
              ? `▲ ${delta} more than the 7 days before`
              : `▼ ${-delta} fewer than the 7 days before. Rest counts too 💛`}
        </Text>
        <View style={styles.scoreRow}>
          <View style={styles.scoreStat}>
            <Text style={styles.scoreStatNum}>🔥 {streak}</Text>
            <Text style={styles.scoreStatLabel}>day streak</Text>
          </View>
          <View style={styles.scoreStat}>
            <Text style={styles.scoreStatNum}>{daysHit}/7</Text>
            <Text style={styles.scoreStatLabel}>targets hit</Text>
          </View>
          <View style={styles.scoreStat}>
            <Text style={styles.scoreStatNum}>{best}</Text>
            <Text style={styles.scoreStatLabel}>best streak</Text>
          </View>
        </View>
      </Card>

      <SectionTitle title="Daily wins" subtitle={weekTotal ? `Best day: ${weekdayLabel[weekdayOf(bestDay)]} with ${byDate[bestDay] ?? 0} wins` : 'Your daily wins will grow here'} />
      <Card>
        <View style={styles.bars}>
          {week.map((d) => {
            const w = byDate[d] ?? 0;
            const target = targetOn(dayModes, d);
            const hit = w >= target;
            const mode = modeOn(dayModes, d);
            return (
              <View key={d} style={styles.barCol}>
                <Text style={styles.barNum}>{w}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.targetLine, { bottom: `${(target / maxDay) * 100}%` }]} />
                  <View style={[styles.barFill, { height: `${(w / maxDay) * 100}%`, backgroundColor: hit ? colors.matcha : colors.peach }]} />
                </View>
                <Text style={styles.barMode}>{energyMeta[mode].emoji}</Text>
                <Text style={[styles.barLabel, d === today && { color: colors.espresso }]}>{d === today ? 'Today' : weekdayLabel[weekdayOf(d)]}</Text>
              </View>
            );
          })}
        </View>
        <Text style={[ui.muted, { marginTop: 8, fontSize: 11 }]}>Dashed line = that day’s Energy Mode target. Green = target hit.</Text>
      </Card>

      <SectionTitle title="Habit matrix" subtitle="Your most consistent micro-wins" />
      <Card>
        <View style={styles.matrixHeader}>
          <View style={{ flex: 1 }} />
          {week.map((d) => (
            <Text key={d} style={styles.matrixDay}>
              {weekdayLabel[weekdayOf(d)][0]}
            </Text>
          ))}
        </View>
        {matrix.map(({ task, cells, count }) => (
          <View key={task.id} style={styles.matrixRow}>
            <Text style={styles.matrixLabel} numberOfLines={1}>
              {task.emoji} {task.title}
            </Text>
            {cells.map((on, i) => (
              <View key={i} style={styles.matrixCellWrap}>
                <View style={[styles.matrixCell, { backgroundColor: on ? categoryMeta[task.category].color : colors.cardSoft }]} />
              </View>
            ))}
            <Text style={styles.matrixCount}>{count}</Text>
          </View>
        ))}
        {matrix.length === 0 ? <Text style={ui.muted}>Complete a few tasks to see your patterns.</Text> : null}
      </Card>

      <SectionTitle title="Where your energy went" subtitle={catTotal ? `Mostly ${categoryMeta[topCat].short} this week` : 'Category balance'} />
      <Card style={styles.balance}>
        <View style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Donut values={categoryOrder.map((c) => ({ value: cats[c], color: categoryMeta[c].color }))} />
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.donutCenter}>
              <Text style={styles.donutNum}>{catTotal}</Text>
              <Text style={styles.donutLabel}>wins</Text>
            </View>
          </View>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          {categoryOrder.map((c) => (
            <View key={c}>
              <View style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: categoryMeta[c].color }]} />
                <Text style={styles.legendLabel} numberOfLines={1}>
                  {categoryMeta[c].short}
                </Text>
                <Text style={styles.legendPct}>{catTotal ? Math.round((cats[c] / catTotal) * 100) : 0}%</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.tiles}>
        <View style={[styles.tile, { backgroundColor: colors.lilacTint }]}>
          <Text style={styles.tileEmoji}>📚</Text>
          <Text style={styles.tileNum}>{formatDuration(focusMin)}</Text>
          <Text style={styles.tileLabel}>focused</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: colors.matchaTint }]}>
          <Text style={styles.tileEmoji}>{moveWeek[0] ? sportMeta[moveWeek[0].sport].emoji : '🏃‍♀️'}</Text>
          <Text style={styles.tileNum}>{formatDuration(moveMin)}</Text>
          <Text style={styles.tileLabel}>moved</Text>
        </View>
        <View style={[styles.tile, { backgroundColor: colors.butterTint }]}>
          <Text style={styles.tileEmoji}>🌟</Text>
          <Text style={styles.tileNum}>{msWeek}</Text>
          <Text style={styles.tileLabel}>milestones</Text>
        </View>
      </View>

      <SectionTitle title="Trophies" subtitle={`${trophies.filter((t) => t.unlocked).length}/${trophies.length} unlocked`} />
      <View style={styles.trophies}>
        {trophies.map((t) => (
          <View key={t.title} style={[styles.trophy, !t.unlocked && { opacity: 0.45 }]}>
            <Text style={styles.trophyEmoji}>{t.unlocked ? t.emoji : '🔒'}</Text>
            <Text style={styles.trophyTitle}>{t.title}</Text>
            <Text style={styles.trophyDesc}>{t.desc}</Text>
          </View>
        ))}
      </View>

      <AccountCard />
    </Screen>
  );
}

const styles = StyleSheet.create({
  score: { marginTop: 16, alignItems: 'center', backgroundColor: colors.butterTint, paddingVertical: 24 },
  scoreNum: { fontSize: 64, fontWeight: '900', color: colors.espresso, letterSpacing: -2 },
  scoreLabel: { fontSize: 18, fontWeight: '800', color: colors.espresso, marginTop: -4 },
  scoreDelta: { fontSize: 13, color: colors.espressoSoft, marginTop: 6, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', marginTop: 18, width: '100%' },
  scoreStat: { flex: 1, alignItems: 'center' },
  scoreStatNum: { fontSize: 20, fontWeight: '900', color: colors.espresso },
  scoreStatLabel: { fontSize: 12, color: colors.espressoSoft, marginTop: 2 },
  bars: { flexDirection: 'row', gap: 6, height: 170 },
  barCol: { flex: 1, alignItems: 'center' },
  barNum: { fontSize: 11, fontWeight: '800', color: colors.espresso, marginBottom: 4 },
  barTrack: { flex: 1, width: '100%', backgroundColor: colors.cardSoft, borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 8 },
  targetLine: { position: 'absolute', left: 0, right: 0, borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.espressoSoft, zIndex: 2 },
  barMode: { fontSize: 12, marginTop: 4 },
  barLabel: { fontSize: 10, color: colors.muted, fontWeight: '700' },
  matrixHeader: { flexDirection: 'row', marginBottom: 6, paddingRight: 22 },
  matrixDay: { width: 24, textAlign: 'center', fontSize: 11, fontWeight: '800', color: colors.muted },
  matrixRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  matrixLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.espresso, paddingRight: 6 },
  matrixCellWrap: { width: 24, alignItems: 'center' },
  matrixCell: { width: 18, height: 18, borderRadius: 6 },
  matrixCount: { width: 22, textAlign: 'right', fontSize: 11, fontWeight: '800', color: colors.espressoSoft },
  balance: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  donutCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  donutNum: { fontSize: 26, fontWeight: '900', color: colors.espresso },
  donutLabel: { fontSize: 11, color: colors.muted, fontWeight: '700' },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.espresso },
  legendPct: { fontSize: 13, fontWeight: '800', color: colors.espressoSoft },
  tiles: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tile: { flex: 1, borderRadius: radius.lg, padding: 14 },
  tileEmoji: { fontSize: 20 },
  tileNum: { fontSize: 18, fontWeight: '900', color: colors.espresso, marginTop: 6 },
  tileLabel: { fontSize: 12, color: colors.espressoSoft },
  trophies: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  trophy: { width: '48%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: 14 },
  trophyEmoji: { fontSize: 28 },
  trophyTitle: { fontSize: 14, fontWeight: '800', color: colors.espresso, marginTop: 6 },
  trophyDesc: { fontSize: 12, color: colors.muted, marginTop: 2 },
});
