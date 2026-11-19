import { GripVertical } from 'lucide-react-native';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius } from '../theme';

/** Press the grip and drag the row. The drop snaps inside the list, so the ends stay put. */
export function ReorderRow({
  index,
  count,
  onReorder,
  testID,
  label,
  children,
  style,
}: {
  index: number;
  count: number;
  onReorder: (from: number, to: number) => void;
  testID?: string;
  label: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const translate = useRef(new Animated.Value(0)).current;
  const height = useRef(64);
  const ctx = useRef({ index, count, onReorder });
  ctx.current = { index, count, onReorder };
  const [dragging, setDragging] = useState(false);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onShouldBlockNativeResponder: () => true,
        onPanResponderGrant: () => setDragging(true),
        onPanResponderMove: (_, gesture) => {
          const { index: from, count: total } = ctx.current;
          const h = height.current || 64;
          const max = Math.max(0, total - 1);
          const slot = Math.min(max, Math.max(0, from + gesture.dy / h));
          translate.setValue((slot - from) * h);
        },
        onPanResponderRelease: (_, gesture) => {
          const { index: from, count: total, onReorder: reorder } = ctx.current;
          const h = height.current || 64;
          const to = Math.max(0, Math.min(Math.max(0, total - 1), from + Math.round(gesture.dy / h)));
          translate.setValue(0);
          setDragging(false);
          if (to !== from) reorder(from, to);
        },
        onPanResponderTerminate: () => {
          translate.setValue(0);
          setDragging(false);
        },
      }),
    [translate],
  );

  return (
    <Animated.View
      onLayout={(e) => {
        const next = e.nativeEvent.layout.height;
        if (next > 0) height.current = next;
      }}
      style={[styles.row, style, dragging && styles.dragging, { transform: [{ translateY: translate }], zIndex: dragging ? 3 : 0 }]}
    >
      <View
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={label}
        {...pan.panHandlers}
        style={styles.grip}
      >
        <GripVertical size={16} color={colors.espressoSoft} />
      </View>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  dragging: {
    shadowColor: colors.espresso,
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  grip: {
    width: 32,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
});
