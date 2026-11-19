import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Sheet } from '../components/Sheet';
import { Button, Card, H1, Screen } from '../components/ui';
import { addDays, fromDateKey, todayKey } from '../lib/date';
import {
  GALLON_OZ,
  HARD_DAYS,
  HARD_RULE_LABELS,
  WATER_ML_STEP_OZ,
  WATER_OZ_STEP,
  canEditHardDay,
  challengeDayNumber,
  completedDayCount,
  missedChallengeDate,
  ruleFlags,
  rulesDone,
  tileTone,
} from '../lib/hard75';
import { pickProgressPhoto } from '../lib/hardPhoto';
import { useGlowStore } from '../store/useGlowStore';
import { colors, radius } from '../theme';
import type { SeventyFiveHardDayLog } from '../types';

const FILE_ID = 'hard75-photo-file';

export function SeventyFiveHardScreen() {
  const hard = useGlowStore((s) => s.seventyFiveHard);
  const start = useGlowStore((s) => s.startSeventyFiveHard);
  const pause = useGlowStore((s) => s.pauseSeventyFiveHard);
  const restart = useGlowStore((s) => s.restartSeventyFiveHard);
  const setMode = useGlowStore((s) => s.setSeventyFiveHardMode);
  const setBlur = useGlowStore((s) => s.setHardPhotosBlurred);
  const toggleRule = useGlowStore((s) => s.toggleHardRule);
  const toggleWorkout = useGlowStore((s) => s.toggleHardWorkout);
  const addWater = useGlowStore((s) => s.addHardWater);
  const setBook = useGlowStore((s) => s.setHardBook);
  const setPhoto = useGlowStore((s) => s.setHardPhoto);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [summaryDate, setSummaryDate] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.id = FILE_ID;
    input.setAttribute('data-testid', FILE_ID);
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      setPhoto(URL.createObjectURL(file));
      input.value = '';
    });
    document.body.appendChild(input);
    return () => input.remove();
  }, [setPhoto]);

  const today = todayKey();
  const day = challengeDayNumber(hard.startDate, today);
  const log = hard.dailyLogs[today];
  const done = rulesDone(log);
  const missed = missedChallengeDate(hard, today);
  const editable = canEditHardDay(hard, today);
  const kept = completedDayCount(hard, today);
  const percent = Math.round((day / HARD_DAYS) * 100);
  const remaining = Math.max(0, HARD_DAYS - day);

  const attach = async () => {
    const uri = await pickProgressPhoto();
    if (uri) {
      setPhoto(uri);
      return;
    }
    if (Platform.OS === 'web') document.getElementById(FILE_ID)?.click();
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Pressable accessibilityRole="button" onPress={() => router.navigate('/')} style={styles.back}>
          <Text style={styles.backText}>← Today</Text>
        </Pressable>
        <H1 style={{ marginTop: 6 }}>75 Hard 🔥</H1>
        <Text style={styles.lead}>Five non-negotiables. Photos never leave this device.</Text>

        {!hard.isActive ? (
          <Card style={{ marginTop: 16 }}>
            <Text style={styles.cardTitle}>{hard.startDate ? `Paused · Day ${day}` : 'Ready when you are'}</Text>
            <Text style={styles.cardBody}>
              {hard.startDate
                ? 'Resume to keep this attempt, or restart from Day 1.'
                : 'Hardcore mode is the real challenge: miss a day and it offers to start over. Soft mode keeps every day you finish.'}
            </Text>
            <Button testID="hard75-start" label={hard.startDate ? 'Resume 75 Hard' : 'Start 75 Hard Challenge'} onPress={start} style={{ marginTop: 14 }} />
          </Card>
        ) : (
          <>
            <Card style={styles.hero}>
              <Text style={styles.dayBadge}>Day {day} of {HARD_DAYS}</Text>
              <Text style={styles.percent}>{percent}%</Text>
              <Text style={styles.cardBody}>{remaining} days remaining · {kept} completed day{kept === 1 ? '' : 's'} kept</Text>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${percent}%` }]} />
              </View>
            </Card>

            <View style={styles.modeRow}>
              <Pressable
                testID="hard75-mode-hardcore"
                accessibilityRole="button"
                aria-selected={hard.mode === 'hardcore'}
                onPress={() => setMode('hardcore')}
                style={[styles.mode, hard.mode === 'hardcore' && styles.modeOn]}
              >
                <Text style={[styles.modeText, hard.mode === 'hardcore' && styles.modeTextOn]}>Official Hardcore</Text>
              </Pressable>
              <Pressable
                testID="hard75-mode-soft"
                accessibilityRole="button"
                aria-selected={hard.mode === 'soft'}
                onPress={() => setMode('soft')}
                style={[styles.mode, hard.mode === 'soft' && styles.modeOn]}
              >
                <Text style={[styles.modeText, hard.mode === 'soft' && styles.modeTextOn]}>Soft / Custom</Text>
              </Pressable>
            </View>
            <Text style={styles.modeHint}>
              {hard.mode === 'hardcore' ? 'Miss a rule and the challenge asks to reset to Day 1.' : 'Soft mode keeps completed days when life happens.'}
            </Text>

            <Text style={styles.section}>Today’s 5 non-negotiables</Text>
            <Text style={styles.sectionSub}>{done}/5 rules done{editable ? '' : ' · this day is closed'}</Text>

            <RuleRow n={1} on={!!log?.rule1Diet} label={HARD_RULE_LABELS.rule1} disabled={!editable} onPress={() => toggleRule(1)} />

            <Card style={styles.ruleCard}>
              <RuleRow n={2} on={!!(log && ruleFlags(log).rule2)} label={HARD_RULE_LABELS.rule2} disabled={!editable} onPress={() => toggleRule(2)} bare />
              <View style={styles.subRow}>
                <Pressable testID="hard75-workout-1" accessibilityRole="checkbox" aria-checked={!!log?.rule2Workout1} disabled={!editable} onPress={() => toggleWorkout(1)} style={[styles.sub, log?.rule2Workout1 && styles.subOn]}>
                  <Text style={styles.subText}>{log?.rule2Workout1 ? '✓ ' : ''}Workout 1</Text>
                </Pressable>
                <Pressable testID="hard75-workout-2" accessibilityRole="checkbox" aria-checked={!!log?.rule2Workout2Outdoor} disabled={!editable} onPress={() => toggleWorkout(2)} style={[styles.sub, log?.rule2Workout2Outdoor && styles.subOn]}>
                  <Text style={styles.subText}>{log?.rule2Workout2Outdoor ? '✓ ' : ''}Workout 2 🌳</Text>
                </Pressable>
              </View>
            </Card>

            <Card style={styles.ruleCard}>
              <RuleRow n={3} on={!!log?.rule3WaterGallon} label={HARD_RULE_LABELS.rule3} disabled={!editable} onPress={() => toggleRule(3)} bare />
              <Text style={styles.water} testID="hard75-water-label">
                {log?.waterOzLogged ?? 0} / {GALLON_OZ} oz · {(((log?.waterOzLogged ?? 0) * 29.5735) / 1000).toFixed(1)} / 3.8 L
              </Text>
              <View style={styles.subRow}>
                <Pressable testID="hard75-water-250" accessibilityRole="button" disabled={!editable} onPress={() => addWater(WATER_ML_STEP_OZ)} style={styles.sub}>
                  <Text style={styles.subText}>+250 ml</Text>
                </Pressable>
                <Pressable testID="hard75-water-16" accessibilityRole="button" disabled={!editable} onPress={() => addWater(WATER_OZ_STEP)} style={styles.sub}>
                  <Text style={styles.subText}>+16 oz</Text>
                </Pressable>
              </View>
            </Card>

            <Card style={styles.ruleCard}>
              <RuleRow n={4} on={!!log?.rule4Read10Pages} label={HARD_RULE_LABELS.rule4} disabled={!editable} onPress={() => toggleRule(4)} bare />
              <TextInput
                testID="hard75-book"
                value={log?.bookNote ?? ''}
                onChangeText={setBook}
                editable={editable}
                placeholder="Book title and pages"
                placeholderTextColor={colors.muted}
                style={styles.input}
              />
            </Card>

            <Card style={styles.ruleCard}>
              <RuleRow n={5} on={!!log?.rule5ProgressPic} label={HARD_RULE_LABELS.rule5} disabled={!editable} onPress={() => toggleRule(5)} bare />
              {log?.photoUri ? <ProgressImage uri={log.photoUri} blurred={hard.photosBlurred} /> : null}
              <Button testID="hard75-photo" label={log?.photoUri ? 'Replace today’s photo' : 'Attach / View today’s photo'} variant="soft" onPress={() => void attach()} disabled={!editable} style={{ marginTop: 10 }} />
              <Text style={styles.private}>Saved as a local URI on this device. Image bytes are never uploaded.</Text>
            </Card>

            <Text style={styles.section}>75-day grid</Text>
            <Text style={styles.sectionSub}>Matcha is a finished day. Butter is today. Tap a past day for the recap.</Text>
            <View testID="hard75-grid" style={styles.grid}>
              {hard.startDate
                ? Array.from({ length: HARD_DAYS }, (_, i) => {
                    const n = i + 1;
                    const date = addDays(hard.startDate as string, i);
                    const tone = tileTone(hard.startDate as string, n, today, hard.dailyLogs);
                    const label = tone === 'done' ? `Day ${n} complete` : tone === 'today' ? `Day ${n} today` : tone === 'missed' ? `Day ${n} missed` : `Day ${n} upcoming`;
                    return (
                      <Pressable
                        key={n}
                        testID={`hard75-day-${n}`}
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        onPress={() => tone !== 'future' && tone !== 'today' && setSummaryDate(date)}
                        style={[styles.tile, tone === 'done' && styles.tileDone, tone === 'today' && styles.tileToday, tone === 'missed' && styles.tileMissed]}
                      >
                        <Text style={styles.tileText}>{n}</Text>
                      </Pressable>
                    );
                  })
                : null}
            </View>

            <Text style={styles.section}>Progress gallery</Text>
            <Text style={styles.sectionSub}>Before and today. Blur them at the gym.</Text>
            <Gallery hard={hard} today={today} />
            <Pressable testID="hard75-blur" accessibilityRole="switch" aria-checked={hard.photosBlurred} onPress={() => setBlur(!hard.photosBlurred)} style={styles.blurRow}>
              <View style={[styles.box, hard.photosBlurred && styles.boxOn]}>
                <Text style={styles.boxMark}>{hard.photosBlurred ? '✓' : ''}</Text>
              </View>
              <Text style={styles.ruleText}>Blur photos</Text>
            </Pressable>

            <View style={styles.actions}>
              <Button testID="hard75-pause" label="Pause challenge" variant="soft" onPress={pause} />
              <Button testID="hard75-restart" label="Restart from Day 1" variant="danger" onPress={() => setConfirmRestart(true)} />
            </View>
          </>
        )}
      </Screen>

      <Modal visible={!!missed && hard.isActive && hard.mode === 'hardcore'} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard} testID="hard75-reset-prompt">
            <Text style={styles.modalTitle}>Reset to Day 1?</Text>
            <Text style={styles.modalBody}>
              You missed a non-negotiable{missed ? ` on ${fromDateKey(missed).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}. Official 75 Hard starts over. Soft mode keeps every day you already completed.
            </Text>
            <Button testID="hard75-reset-confirm" label="Reset to Day 1" onPress={restart} />
            <Button testID="hard75-reset-soft" label="Switch to Soft mode" variant="soft" onPress={() => setMode('soft')} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>

      <Modal visible={confirmRestart} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Restart from Day 1?</Text>
            <Text style={styles.modalBody}>The grid clears. Wins you already earned on past days stay in your ring. Today’s challenge wins for this attempt are reversed.</Text>
            <Button testID="hard75-restart-confirm" label="Restart from Day 1" onPress={() => { setConfirmRestart(false); restart(); }} />
            <Button label="Keep going" variant="soft" onPress={() => setConfirmRestart(false)} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>

      <Sheet visible={!!summaryDate} onClose={() => setSummaryDate(null)} title={summaryDate ? fromDateKey(summaryDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : ''} subtitle="Read-only recap">
        {summaryDate ? <DaySummary log={hard.dailyLogs[summaryDate]} blurred={hard.photosBlurred} /> : null}
      </Sheet>
    </View>
  );
}

function RuleRow({ n, on, label, onPress, disabled, bare }: { n: number; on: boolean; label: string; onPress: () => void; disabled?: boolean; bare?: boolean }) {
  const body = (
    <Pressable testID={`hard75-rule-${n}`} accessibilityRole="checkbox" aria-checked={on} disabled={disabled} onPress={onPress} style={styles.ruleHit}>
      <View style={[styles.box, on && styles.boxOn]}>
        <Text style={styles.boxMark}>{on ? '✓' : ''}</Text>
      </View>
      <Text style={styles.ruleText}>{label}</Text>
    </Pressable>
  );
  if (bare) return body;
  return <Card style={styles.ruleCard}>{body}</Card>;
}

function ProgressImage({ uri, blurred }: { uri: string; blurred: boolean }) {
  return (
    <Image
      source={{ uri }}
      accessibilityLabel={blurred ? 'Progress photo blurred' : 'Progress photo'}
      blurRadius={blurred ? 24 : 0}
      style={[styles.photo, Platform.OS === 'web' && blurred ? ({ filter: 'blur(14px)' } as object) : null]}
    />
  );
}

function Gallery({ hard, today }: { hard: { startDate: string | null; dailyLogs: Record<string, SeventyFiveHardDayLog>; photosBlurred: boolean }; today: string }) {
  if (!hard.startDate) return null;
  const first = hard.dailyLogs[hard.startDate]?.photoUri;
  let latest: string | undefined;
  let latestDate = hard.startDate;
  for (let i = 0; i < HARD_DAYS; i++) {
    const date = addDays(hard.startDate, i);
    if (date > today) break;
    const uri = hard.dailyLogs[date]?.photoUri;
    if (uri) {
      latest = uri;
      latestDate = date;
    }
  }
  if (!first && !latest) {
    return (
      <Card>
        <Text style={styles.cardBody}>No progress photos yet. When you attach one, Day 1 and your latest sit here. They stay on this device.</Text>
      </Card>
    );
  }
  return (
    <View testID="hard75-gallery" style={styles.gallery}>
      <GalleryShot label="Day 1" uri={first} blurred={hard.photosBlurred} />
      <GalleryShot label={latestDate === hard.startDate ? 'Today' : 'Latest'} uri={latest} blurred={hard.photosBlurred} />
    </View>
  );
}

function GalleryShot({ label, uri, blurred }: { label: string; uri?: string; blurred: boolean }) {
  return (
    <View style={styles.shot}>
      {uri ? <ProgressImage uri={uri} blurred={blurred} /> : <View style={[styles.photo, styles.photoEmpty]}><Text style={styles.cardBody}>No photo</Text></View>}
      <Text style={styles.shotLabel}>{label}</Text>
    </View>
  );
}

function DaySummary({ log, blurred }: { log?: SeventyFiveHardDayLog; blurred: boolean }) {
  const flags = log ? ruleFlags(log) : null;
  return (
    <View testID="hard75-day-summary">
      {(['rule1', 'rule2', 'rule3', 'rule4', 'rule5'] as const).map((rule) => (
        <Text key={rule} style={styles.summaryLine}>
          {flags?.[rule] ? '✓' : '○'} {HARD_RULE_LABELS[rule]}
        </Text>
      ))}
      {log?.bookNote ? <Text style={styles.cardBody}>Book: {log.bookNote}</Text> : null}
      {log?.waterOzLogged ? <Text style={styles.cardBody}>{log.waterOzLogged} oz of water logged</Text> : null}
      {log?.photoUri ? <ProgressImage uri={log.photoUri} blurred={blurred} /> : <Text style={styles.cardBody}>No photo stored on this device for that day.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'flex-start', marginTop: 4 },
  backText: { fontSize: 14, fontWeight: '700', color: colors.espressoSoft },
  lead: { fontSize: 14, color: colors.espressoSoft, marginTop: 4 },
  hero: { marginTop: 16, backgroundColor: colors.butterTint },
  dayBadge: { fontSize: 22, fontWeight: '900', color: colors.espresso },
  percent: { fontSize: 40, fontWeight: '900', color: colors.espresso, letterSpacing: -1, marginTop: 2 },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.espresso },
  cardBody: { fontSize: 13, color: colors.espressoSoft, marginTop: 4, lineHeight: 18 },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.card, marginTop: 12, overflow: 'hidden' },
  trackFill: { height: 8, backgroundColor: colors.matcha },
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  mode: { flex: 1, paddingVertical: 12, borderRadius: radius.pill, backgroundColor: colors.cardSoft, alignItems: 'center' },
  modeOn: { backgroundColor: colors.espresso },
  modeText: { fontSize: 13, fontWeight: '800', color: colors.espresso },
  modeTextOn: { color: colors.oat },
  modeHint: { fontSize: 12, color: colors.muted, marginTop: 8 },
  section: { fontSize: 19, fontWeight: '800', color: colors.espresso, marginTop: 22 },
  sectionSub: { fontSize: 13, color: colors.muted, marginTop: 2, marginBottom: 8 },
  ruleCard: { marginTop: 10 },
  ruleHit: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  box: { width: 28, height: 28, borderRadius: 9, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.oat },
  boxOn: { backgroundColor: colors.matcha, borderColor: colors.matcha },
  boxMark: { fontSize: 15, fontWeight: '900', color: colors.espresso },
  ruleText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.espresso },
  subRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  sub: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.cardSoft, alignItems: 'center' },
  subOn: { backgroundColor: colors.matchaTint, borderWidth: 1, borderColor: colors.matcha },
  subText: { fontSize: 13, fontWeight: '700', color: colors.espresso },
  water: { fontSize: 13, fontWeight: '700', color: colors.espressoSoft, marginTop: 8 },
  input: { marginTop: 10, backgroundColor: colors.oat, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.espresso },
  photo: { width: '100%', height: 160, borderRadius: radius.md, marginTop: 10, backgroundColor: colors.cardSoft },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  private: { fontSize: 12, color: colors.muted, marginTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardSoft },
  tileDone: { backgroundColor: '#8FA882' },
  tileToday: { backgroundColor: '#F9E076' },
  tileMissed: { backgroundColor: colors.peachTint },
  tileText: { fontSize: 12, fontWeight: '800', color: colors.espresso },
  gallery: { flexDirection: 'row', gap: 10 },
  shot: { flex: 1 },
  shotLabel: { fontSize: 12, fontWeight: '800', color: colors.espressoSoft, marginTop: 4 },
  blurRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  actions: { gap: 8, marginTop: 22 },
  summaryLine: { fontSize: 14, color: colors.espresso, marginBottom: 6, fontWeight: '600' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(44,34,30,0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { width: '100%', maxWidth: 360, backgroundColor: colors.card, borderRadius: radius.xl, padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: colors.espresso },
  modalBody: { fontSize: 14, color: colors.espressoSoft, marginTop: 8, marginBottom: 16, lineHeight: 20 },
});
