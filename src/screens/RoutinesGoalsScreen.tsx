import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { H1, Screen, Segmented, ui } from '../components/ui';
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
      <H1 style={{ marginTop: 8 }}>{panel === 'routines' ? 'Routines 🫧' : 'Big Goals 🪜'}</H1>
      <Text style={[ui.muted, { marginTop: 2, marginBottom: 14 }]}>
        {panel === 'routines' ? 'Your shelves and the rituals that make your days' : 'Every milestone is a +3 Super Win'}
      </Text>
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
