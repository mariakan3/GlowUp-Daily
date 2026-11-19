import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, H1, Screen, Segmented, ui } from '../components/ui';
import { colors } from '../theme';
import { GoalsScreen } from './GoalsScreen';
import { RoutinesScreen } from './RoutinesScreen';

type Panel = 'routines' | 'goals';

export function RoutinesGoalsScreen() {
  const params = useLocalSearchParams<{ panel?: string }>();
  const isPanel = (v?: string): v is Panel => v === 'goals' || v === 'routines';
  const [state, setState] = useState<{ param?: string; panel: Panel }>({ param: params.panel, panel: isPanel(params.panel) ? params.panel : 'routines' });
  if (state.param !== params.panel) setState({ param: params.panel, panel: isPanel(params.panel) ? params.panel : state.panel });
  const panel = state.panel;
  const setPanel = (p: Panel) => setState((s) => ({ ...s, panel: p }));

  return (
    <Screen>
      <H1 style={{ marginTop: 8 }}>{panel === 'routines' ? 'Routines 🫧' : 'Big Goals ✨'}</H1>
      <Text style={[ui.muted, { marginTop: 2, marginBottom: 14 }]}>
        {panel === 'routines' ? 'Your shelves and the rituals that make your days' : 'Every milestone is a +3 Super Win'}
      </Text>
      <Pressable testID="hard75-routines-link" accessibilityRole="button" onPress={() => router.push('/hard')}>
        <Card style={{ marginBottom: 14, backgroundColor: colors.butterTint }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.espresso }}>🔥 75 Hard Hub</Text>
          <Text style={[ui.muted, { marginTop: 4 }]}>Five rules, a 75-day grid, and progress photos that stay on this device.</Text>
        </Card>
      </Pressable>
      <Segmented
        value={panel}
        onChange={setPanel}
        options={[
          { value: 'routines', label: '🧴 Routines' },
          { value: 'goals', label: '🎯 Goals' },
        ]}
      />
      <View style={{ marginTop: 6 }}>{panel === 'routines' ? <RoutinesScreen /> : <GoalsScreen />}</View>
    </Screen>
  );
}
