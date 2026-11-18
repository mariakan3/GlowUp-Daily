import { X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MovementLogModal } from '../components/MovementLogModal';
import { Card, IconButton, SectionTitle, ui } from '../components/ui';
import { formatDuration, lastSevenDays, weekdayLabel, weekdayOf } from '../lib/date';
import { winFeedback } from '../lib/feedback';
import { useToday } from '../lib/hooks';
import { useGlowStore } from '../store/useGlowStore';
import { colors, radius, shadow, sportMeta, sportOrder } from '../theme';
import type { SportId } from '../types';

export function MovementScreen() {
  const today = useToday();
  const sessions = useGlowStore((s) => s.movementSessions);
  const deleteMovement = useGlowStore((s) => s.deleteMovement);
  const [logging, setLogging] = useState<SportId | null>(null);

  const week = useMemo(() => lastSevenDays(today), [today]);
  const weekSessions = useMemo(() => sessions.filter((s) => week.includes(s.date)).sort((a, b) => b.ts - a.ts), [sessions, week]);
  const totalMin = weekSessions.reduce((a, s) => a + s.minutes, 0);
  const bySport = sportOrder.map((sp) => ({ sport: sp, minutes: weekSessions.filter((s) => s.sport === sp).reduce((a, s) => a + s.minutes, 0), count: weekSessions.filter((s) => s.sport === sp).length }));
  const activeDays = new Set(weekSessions.map((s) => s.date)).size;

  return (
    <View>
      <Text style={styles.lead}>Tap a sport to log it. It checks off the matching task on Today, too.</Text>
      <View style={styles.grid}>
        {sportOrder.map((sp) => {
          const meta = sportMeta[sp];
          const todayCount = sessions.filter((s) => s.sport === sp && s.date === today).length;
          return (
            <Pressable
              key={sp}
              testID={`sport-${sp}`}
              accessibilityRole="button"
              accessibilityLabel={`Log ${meta.label}`}
              onPress={() => {
                winFeedback('tap');
                setLogging(sp);
              }}
              style={({ pressed }) => [styles.tile, { backgroundColor: meta.tint }, sp === 'walk' && styles.tileWide, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <Text style={styles.tileEmoji}>{meta.emoji}</Text>
              <Text style={styles.tileLabel}>{meta.label}</Text>
              <Text style={styles.tileSub}>{todayCount ? `✓ ${todayCount} today` : 'Tap to log'}</Text>
            </Pressable>
          );
        })}
      </View>

      <SectionTitle title="Movement Mix" subtitle="Last 7 days" />
      <Card>
        <View style={styles.statRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.statNum}>{formatDuration(totalMin)}</Text>
            <Text style={ui.muted}>moved</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statNum}>{weekSessions.length}</Text>
            <Text style={ui.muted}>sessions</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.statNum}>{activeDays}/7</Text>
            <Text style={ui.muted}>active days</Text>
          </View>
        </View>

        <View style={styles.stack}>
          {totalMin === 0 ? <View style={{ flex: 1, backgroundColor: colors.cardSoft }} /> : null}
          {bySport
            .filter((b) => b.minutes > 0)
            .map((b) => (
              <View key={b.sport} style={{ flex: b.minutes, backgroundColor: sportMeta[b.sport].color }} />
            ))}
        </View>
        {bySport.map((b) => (
          <View key={b.sport} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: sportMeta[b.sport].color }]} />
            <Text style={styles.legendLabel}>
              {sportMeta[b.sport].emoji} {sportMeta[b.sport].label}
            </Text>
            <Text style={ui.muted}>
              {b.count}× · {formatDuration(b.minutes)} · {totalMin ? Math.round((b.minutes / totalMin) * 100) : 0}%
            </Text>
          </View>
        ))}

        <View style={styles.days}>
          {week.map((d) => {
            const daySessions = weekSessions.filter((s) => s.date === d);
            return (
              <View key={d} style={styles.dayCol}>
                <View style={styles.dayStack}>
                  {daySessions.length ? (
                    daySessions.map((s) => (
                      <View key={s.id} style={[styles.dayDot, { backgroundColor: sportMeta[s.sport].color }]}>
                        <Text style={{ fontSize: 12 }}>{sportMeta[s.sport].emoji}</Text>
                      </View>
                    ))
                  ) : (
                    <View style={[styles.dayDot, { backgroundColor: colors.cardSoft }]} />
                  )}
                </View>
                <Text style={[styles.dayLabel, d === today && { color: colors.espresso }]}>{d === today ? 'Today' : weekdayLabel[weekdayOf(d)]}</Text>
              </View>
            );
          })}
        </View>
      </Card>

      <SectionTitle title="Session log" subtitle="Your sweaty little diary" />
      {weekSessions.length === 0 ? (
        <Card>
          <Text style={ui.muted}>No sessions yet this week. Your first one is a tap away.</Text>
        </Card>
      ) : (
        weekSessions.slice(0, 12).map((s) => (
          <View key={s.id} style={styles.session} testID="movement-session">
            <View style={[styles.sessionIcon, { backgroundColor: sportMeta[s.sport].tint }]}>
              <Text style={{ fontSize: 20 }}>{sportMeta[s.sport].emoji}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sessionTitle}>
                {sportMeta[s.sport].label} · {s.minutes}m {s.vibe}
              </Text>
              <Text style={ui.muted} numberOfLines={2}>
                {s.date === today ? 'Today' : weekdayLabel[weekdayOf(s.date)]}
                {s.note ? ` · “${s.note}”` : ''}
              </Text>
            </View>
            {s.date === today ? (
              <IconButton label="Delete session" onPress={() => deleteMovement(s.id)}>
                <X size={15} color={colors.espressoSoft} />
              </IconButton>
            ) : null}
          </View>
        ))
      )}

      <MovementLogModal sport={logging} onClose={() => setLogging(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  lead: { fontSize: 13, color: colors.espressoSoft, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, borderRadius: radius.lg, padding: 16 },
  tileWide: { width: '100%' },
  tileEmoji: { fontSize: 30 },
  tileLabel: { fontSize: 16, fontWeight: '800', color: colors.espresso, marginTop: 6 },
  tileSub: { fontSize: 12, color: colors.espressoSoft, marginTop: 2, fontWeight: '600' },
  statRow: { flexDirection: 'row' },
  statNum: { fontSize: 22, fontWeight: '900', color: colors.espresso },
  stack: { flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', marginTop: 16, marginBottom: 10, gap: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.espresso },
  days: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
  dayCol: { flex: 1, alignItems: 'center' },
  dayStack: { minHeight: 60, justifyContent: 'flex-end', gap: 3 },
  dayDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontSize: 10, color: colors.muted, fontWeight: '700', marginTop: 6 },
  session: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, marginBottom: 8, ...shadow, shadowOpacity: 0.04 },
  sessionIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sessionTitle: { fontSize: 14, fontWeight: '800', color: colors.espresso },
});
