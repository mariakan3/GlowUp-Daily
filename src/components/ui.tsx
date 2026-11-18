import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.inner, { flex: 1 }]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function H1({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.h1, style]}>{children}</Text>;
}

export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.sectionRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function Pill({
  label,
  active,
  onPress,
  color = colors.matcha,
  tint = colors.matchaTint,
  small,
  testID,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
  tint?: string;
  small?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        small && styles.pillSmall,
        { backgroundColor: active ? color : tint, borderColor: active ? color : 'transparent' },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.pillText, small && { fontSize: 12 }, active && { color: colors.espresso, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segmentItem, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && { color: colors.espresso, fontWeight: '700' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  style,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'soft' | 'ghost' | 'danger';
  icon?: ReactNode;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const bg = variant === 'primary' ? colors.espresso : variant === 'soft' ? colors.cardSoft : variant === 'danger' ? colors.peachTint : 'transparent';
  const fg = variant === 'primary' ? colors.oat : variant === 'danger' ? colors.danger : colors.espresso;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 }, style]}
    >
      {icon}
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ onPress, children, label, style, testID }: { onPress: () => void; children: ReactNode; label: string; style?: StyleProp<ViewStyle>; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }, style]}
    >
      {children}
    </Pressable>
  );
}

export function ProgressBar({ value, color = colors.matcha, height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <View style={[styles.barTrack, { height, borderRadius: height }]}>
      <View style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export const ui = StyleSheet.create({
  muted: { color: colors.muted, fontSize: 13 },
  body: { color: colors.espresso, fontSize: 15 },
  row: { flexDirection: 'row', alignItems: 'center' },
  input: {
    backgroundColor: colors.oat,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.espresso,
    borderWidth: 1,
    borderColor: colors.line,
  },
  label: { fontSize: 12, fontWeight: '700', color: colors.espressoSoft, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 16 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.oat },
  scroll: { paddingBottom: 48 },
  inner: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 8 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, ...shadow },
  h1: { fontSize: 28, fontWeight: '800', color: colors.espresso, letterSpacing: -0.5 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 26, marginBottom: 12 },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.espresso, letterSpacing: -0.3 },
  sectionSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, marginRight: 8, marginBottom: 8 },
  pillSmall: { paddingHorizontal: 10, paddingVertical: 5 },
  pillText: { fontSize: 13, color: colors.espressoSoft, fontWeight: '600' },
  segment: { flexDirection: 'row', backgroundColor: colors.cardSoft, borderRadius: radius.pill, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.card, ...shadow },
  segmentText: { fontSize: 14, color: colors.espressoSoft, fontWeight: '600' },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 18, borderRadius: radius.pill },
  buttonText: { fontSize: 15, fontWeight: '700' },
  iconButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cardSoft },
  barTrack: { backgroundColor: colors.cardSoft, overflow: 'hidden', width: '100%' },
});
