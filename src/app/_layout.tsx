import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FocusTimerWatcher } from '../components/FocusTimerWatcher';
import { Button } from '../components/ui';
import { WinToastBanner } from '../components/WinToastBanner';
import { supabaseConfigError } from '../lib/supabase';
import { AuthScreen } from '../screens/AuthScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { useAuthStore } from '../store/useAuthStore';
import { useGlowStore } from '../store/useGlowStore';
import { colors } from '../theme';

function Splash({ message, children }: { message?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.splash} testID="splash">
      <Text style={styles.splashLogo}>✨</Text>
      <Text style={styles.splashTitle}>GlowUp Daily</Text>
      {message ? <Text style={styles.splashMessage}>{message}</Text> : <ActivityIndicator color={colors.matcha} style={{ marginTop: 16 }} />}
      {children}
    </View>
  );
}

export default function RootLayout() {
  const status = useAuthStore((s) => s.status);
  const dataError = useAuthStore((s) => s.dataError);
  const hydrated = useGlowStore((s) => s.hydrated);
  const onboarded = useGlowStore((s) => s.onboarded);

  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  const ready = status === 'ready' && hydrated;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {status === 'unconfigured' ? (
        <Splash message={supabaseConfigError ?? ''} />
      ) : status === 'signedOut' ? (
        <AuthScreen />
      ) : status === 'dataError' ? (
        <Splash message={dataError ?? 'Something went wrong loading your data.'}>
          <View style={{ gap: 10, marginTop: 20, width: 240 }}>
            <Button label="Try again" onPress={() => useAuthStore.getState().retryData()} />
            <Button label="Sign out" variant="soft" onPress={() => void useAuthStore.getState().signOut()} />
          </View>
        </Splash>
      ) : !ready ? (
        <Splash />
      ) : !onboarded ? (
        <View style={{ flex: 1 }}>
          <OnboardingScreen />
          <WinToastBanner />
        </View>
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.oat }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.oat } }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="hard" />
          </Stack>
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
  splashMessage: { fontSize: 14, color: colors.espressoSoft, marginTop: 14, textAlign: 'center', maxWidth: 320, paddingHorizontal: 20 },
});
