import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { H1, Screen, Segmented, ui } from '../components/ui';
import { MovementScreen } from './MovementScreen';
import { StudyScreen } from './StudyScreen';

type Panel = 'focus' | 'move';

export function FocusMoveScreen() {
  const params = useLocalSearchParams<{ panel?: string }>();
  const [panel, setPanel] = useState<Panel>(params.panel === 'move' ? 'move' : 'focus');
  useEffect(() => {
    if (params.panel === 'move' || params.panel === 'focus') setPanel(params.panel);
  }, [params.panel]);

  return (
    <Screen>
      <H1 style={{ marginTop: 8 }}>{panel === 'focus' ? 'Focus Sprint 📚' : 'Movement Studio 🎾'}</H1>
      <Text style={[ui.muted, { marginTop: 2, marginBottom: 14 }]}>
        {panel === 'focus' ? 'Pick a subject, start the clock, collect +2 wins per block' : 'Pilates, tennis, runs, gym and hot girl walks'}
      </Text>
      <Segmented
        value={panel}
        onChange={setPanel}
        options={[
          { value: 'focus', label: '⏱️ Focus' },
          { value: 'move', label: '🎾 Move' },
        ]}
      />
      <View style={{ marginTop: 18 }}>{panel === 'focus' ? <StudyScreen /> : <MovementScreen />}</View>
    </Screen>
  );
}
