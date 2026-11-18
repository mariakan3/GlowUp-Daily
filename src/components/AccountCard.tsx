import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuthStore } from '../store/useAuthStore';
import { useGlowStore } from '../store/useGlowStore';
import { flush, useSyncStore } from '../sync/syncEngine';
import { colors, radius } from '../theme';
import { Button, Card, IconButton, ui } from './ui';

const statusText = (status: string, pending: number, last: number | null) => {
  if (status === 'syncing' || pending > 0) return `Saving ${pending || ''} change${pending === 1 ? '' : 's'}…`.replace('  ', ' ');
  if (status === 'offline') return 'Offline. Changes are saved on this device and will sync when you’re back.';
  if (status === 'error') return 'Sync paused. We’ll retry automatically.';
  if (last) return `Synced to your account · ${new Date(last).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return 'Synced to your account';
};

export function AccountCard() {
  const email = useAuthStore((s) => s.session?.user.email ?? '');
  const signOut = useAuthStore((s) => s.signOut);
  const userName = useGlowStore((s) => s.userName);
  const setUserName = useGlowStore((s) => s.setUserName);
  const { status, pending, lastSyncedAt, error } = useSyncStore();
  const [name, setName] = useState(userName);
  const [busy, setBusy] = useState(false);
  const healthy = status !== 'offline' && status !== 'error';

  return (
    <Card style={{ marginTop: 28 }}>
      <Text style={styles.title}>Your account</Text>
      <Text style={ui.muted}>{email}</Text>

      <Text style={ui.label}>Display name</Text>
      <View style={styles.row}>
        <TextInput
          testID="display-name-input"
          value={name}
          onChangeText={setName}
          onBlur={() => name.trim() !== userName && setUserName(name)}
          onSubmitEditing={() => setUserName(name)}
          placeholder="What should we call you?"
          placeholderTextColor={colors.muted}
          style={[ui.input, { flex: 1 }]}
        />
      </View>

      <View testID="sync-status" style={[styles.sync, { backgroundColor: healthy ? colors.matchaTint : colors.butterTint }]}>
        {healthy ? <Cloud size={16} color={colors.matchaDeep} /> : <CloudOff size={16} color={colors.espresso} />}
        <Text style={styles.syncText}>{statusText(status, pending, lastSyncedAt)}</Text>
        {!healthy ? (
          <IconButton label="Retry sync" onPress={() => void flush()}>
            <RefreshCw size={14} color={colors.espresso} />
          </IconButton>
        ) : null}
      </View>
      {status === 'error' && error ? <Text style={[ui.muted, { marginTop: 6 }]}>{error}</Text> : null}

      <Button
        testID="sign-out"
        label={busy ? 'Signing out…' : 'Sign out'}
        variant="soft"
        icon={<LogOut size={16} color={colors.espresso} />}
        disabled={busy}
        onPress={async () => {
          setBusy(true);
          await signOut();
        }}
        style={{ marginTop: 14 }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 17, fontWeight: '800', color: colors.espresso },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sync: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: radius.md, padding: 10, marginTop: 14 },
  syncText: { flex: 1, fontSize: 12, color: colors.espresso, fontWeight: '600' },
});
