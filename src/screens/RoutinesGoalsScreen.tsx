import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { H1, Screen, Segmented, ui } from '../components/ui';
import { GoalsScreen } from './GoalsScreen';
import { RoutinesScreen } from './RoutinesScreen';

type Panel = 'routines' | 'goals';

export function RoutinesGoalsScreen() {
  const params = useLocalSearchParams<{ panel?: string }>();
  const [panel, setPanel] = useState<Panel>(params.panel === 'goals' ? 'goals' : 'routines');
  useEffect(() => {
    if (params.panel === 'goals' || params.panel === 'routines') setPanel(params.panel);
  }, [params.panel]);

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
