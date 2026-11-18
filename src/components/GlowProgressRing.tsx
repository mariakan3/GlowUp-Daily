import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useNativeDriver } from '../lib/feedback';
import { colors } from '../theme';

interface Props {
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  secondaryColor?: string;
  glow?: string;
  trackColor?: string;
  /** Changing this value triggers a celebratory pulse. */
  pulseKey?: number;
  children?: ReactNode;
}

/**
 * Animated SVG ring. Progress is tweened through an Animated.Value and mirrored into state, which
 * renders identically on native and react-native-web without animated SVG props.
 */
export function GlowProgressRing({
  progress,
  size = 220,
  stroke = 18,
  color,
  secondaryColor,
  glow,
  trackColor = colors.cardSoft,
  pulseKey,
  children,
}: Props) {
  const clamped = Math.max(0, Math.min(1, progress));
  const anim = useRef(new Animated.Value(clamped)).current;
  const [shown, setShown] = useState(clamped);
  const pulse = useRef(new Animated.Value(1)).current;
  const lastPulse = useRef(pulseKey);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setShown(value));
    return () => anim.removeListener(id);
  }, [anim]);

  useEffect(() => {
    Animated.timing(anim, { toValue: clamped, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [clamped, anim]);

  useEffect(() => {
    if (pulseKey === undefined || pulseKey === lastPulse.current) return;
    const grew = (pulseKey ?? 0) > (lastPulse.current ?? 0);
    lastPulse.current = pulseKey;
    if (!grew) return;
    Animated.sequence([
      Animated.spring(pulse, { toValue: 1.06, useNativeDriver, speed: 40, bounciness: 14 }),
      Animated.spring(pulse, { toValue: 1, useNativeDriver, speed: 14, bounciness: 10 }),
    ]).start();
  }, [pulseKey, pulse]);

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gradId = useRef(`ring-${Math.random().toString(36).slice(2, 8)}`).current;

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ scale: pulse }] }}>
      {glow ? <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: glow, transform: [{ scale: 1.08 }], opacity: 0.9 }]} /> : null}
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} />
            <Stop offset="1" stopColor={secondaryColor ?? color} />
          </LinearGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill={colors.card} />
        {shown > 0.001 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={`url(#${gradId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${c} ${c}`}
            strokeDashoffset={c * (1 - shown)}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});
