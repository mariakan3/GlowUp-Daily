import { StatusBar } from 'expo-status-bar';
import { Tabs } from 'expo-router/js-tabs';
import { ListChecks, Sparkles, Timer, Trophy } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View, type ColorValue } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FocusTimerWatcher } from '../components/FocusTimerWatcher';
import { WinToastBanner } from '../components/WinToastBanner';
import { useTodayStats } from '../lib/hooks';
import { useGlowStore } from '../store/useGlowStore';
import { colors } from '../theme';

function TodayBadgeIcon({ color, size }: { color: ColorValue; size: number }) {
  const { wins, target } = useTodayStats();
  return (
    <View>
      <Sparkles color={color as string} size={size} />
      {wins > 0 ? (
        <View style={[styles.badge, wins >= target && { backgroundColor: colors.matcha }]}>
          <Text style={styles.badgeText}>{wins}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const hydrated = useGlowStore((s) => s.hydrated);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {!hydrated ? (
        <View style={styles.splash}>
          <Text style={styles.splashLogo}>✨</Text>
          <Text style={styles.splashTitle}>GlowUp Daily</Text>
          <ActivityIndicator color={colors.matcha} style={{ marginTop: 16 }} />
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.oat }}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarActiveTintColor: colors.espresso,
              tabBarInactiveTintColor: colors.muted,
              tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.line, height: 64, paddingTop: 6, paddingBottom: 8 },
              tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
              sceneStyle: { backgroundColor: colors.oat },
            }}
          >
            <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: ({ color, size }) => <TodayBadgeIcon color={color} size={size} /> }} />
            <Tabs.Screen name="focus" options={{ title: 'Focus & Move', tabBarIcon: ({ color, size }) => <Timer color={color as string} size={size} /> }} />
            <Tabs.Screen name="routines" options={{ title: 'Routines & Goals', tabBarIcon: ({ color, size }) => <ListChecks color={color as string} size={size} /> }} />
            <Tabs.Screen name="trophy" options={{ title: 'Trophy Room', tabBarIcon: ({ color, size }) => <Trophy color={color as string} size={size} /> }} />
          </Tabs>
          <WinToastBanner />
          <FocusTimerWatcher />
        </View>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.oat },
  splashLogo: { fontSize: 48 },
  splashTitle: { fontSize: 24, fontWeight: '900', color: colors.espresso, marginTop: 8 },
  badge: { position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 10, fontWeight: '900', color: colors.espresso },
});
