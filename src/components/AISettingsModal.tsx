import { KeyRound, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { clearApiKey, getApiKey, maskKey, setApiKey } from '../lib/secureKey';
import { DEFAULT_MODELS } from '../services/aiPlannerService';
import { useGlowStore } from '../store/useGlowStore';
import { colors, radius } from '../theme';
import type { AIProvider } from '../types';
import { Sheet } from './Sheet';
import { Button, Segmented, ui } from './ui';

export function AISettingsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return <AISettingsForm onClose={onClose} />;
}

function AISettingsForm({ onClose }: { onClose: () => void }) {
  const settings = useGlowStore((s) => s.aiSettings);
  const setAISettings = useGlowStore((s) => s.setAISettings);
  const pushToast = useGlowStore((s) => s.pushToast);
  const [provider, setProvider] = useState<AIProvider>(settings.provider);
  const [model, setModel] = useState(settings.model);
  const [draftKey, setDraftKey] = useState('');
  const [savedMask, setSavedMask] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getApiKey().then((k) => alive && setSavedMask(k ? maskKey(k) : null));
    return () => {
      alive = false;
    };
  }, []);

  const chooseProvider = (p: AIProvider) => {
    setProvider(p);
    if (p !== 'off' && (!model || Object.values(DEFAULT_MODELS).includes(model))) setModel(DEFAULT_MODELS[p]);
  };

  const save = async () => {
    let hasKey = !!savedMask;
    if (draftKey.trim()) {
      await setApiKey(draftKey);
      hasKey = true;
    }
    setAISettings({ provider, model: model.trim() || (provider === 'off' ? settings.model : DEFAULT_MODELS[provider]), hasKey });
    pushToast(provider === 'off' ? 'Smart Rules engine on ✨' : `Live ${provider === 'openai' ? 'OpenAI' : 'Gemini'} on, Smart Rules as backup`, 'info');
    onClose();
  };

  const removeKey = async () => {
    await clearApiKey();
    setSavedMask(null);
    setDraftKey('');
    setAISettings({ hasKey: false });
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title="AI engine settings"
      subtitle="Smart Rules work offline with zero setup. Add a key for a live LLM."
      footer={<Button testID="ai-settings-save" label="Save settings" onPress={save} style={{ marginTop: 8 }} />}
    >
      <Text style={ui.label}>Engine</Text>
      <Segmented
        value={provider}
        onChange={chooseProvider}
        options={[
          { value: 'off', label: '✨ Smart Rules' },
          { value: 'openai', label: 'OpenAI' },
          { value: 'gemini', label: 'Gemini' },
        ]}
      />
      {provider === 'off' ? (
        <View style={styles.note}>
          <ShieldCheck size={16} color={colors.matchaDeep} />
          <Text style={styles.noteText}>On-device parser and rules. Instant, private, no network needed.</Text>
        </View>
      ) : (
        <>
          <Text style={ui.label}>Model</Text>
          <TextInput testID="ai-model-input" value={model} onChangeText={setModel} autoCapitalize="none" autoCorrect={false} style={ui.input} placeholder={DEFAULT_MODELS[provider]} placeholderTextColor={colors.muted} />
          <Text style={ui.label}>API key</Text>
          {savedMask ? (
            <View style={styles.saved}>
              <KeyRound size={16} color={colors.espresso} />
              <Text style={styles.savedText}>Saved key {savedMask}</Text>
              <Button label="Remove" variant="danger" onPress={removeKey} style={{ paddingVertical: 8 }} />
            </View>
          ) : null}
          <TextInput
            testID="ai-key-input"
            value={draftKey}
            onChangeText={setDraftKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={savedMask ? 'Paste a new key to replace it' : provider === 'openai' ? 'sk-…' : 'AIza…'}
            placeholderTextColor={colors.muted}
            style={ui.input}
          />
          <View style={styles.note}>
            <ShieldCheck size={16} color={colors.matchaDeep} />
            <Text style={styles.noteText}>
              {Platform.OS === 'web'
                ? 'Stored only in this browser’s local storage, never in the app bundle.'
                : 'Stored in the device keychain via Secure Store, never in the app bundle.'}{' '}
              If the AI is offline or the key fails, your day is remixed with Smart Rules instead.
            </Text>
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.matchaTint, borderRadius: radius.md, padding: 12, marginTop: 12 },
  noteText: { flex: 1, fontSize: 12, color: colors.espresso },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  savedText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.espresso },
});
