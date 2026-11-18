import { Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Segmented, ui } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import { colors, radius, shadow } from '../theme';

type Mode = 'signIn' | 'signUp' | 'forgot' | 'reset';

const emailOk = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

function PasswordInput({ value, onChange, testID, placeholder, onSubmit }: { value: string; onChange: (v: string) => void; testID: string; placeholder: string; onSubmit?: () => void }) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.pwRow}>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="password"
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={[ui.input, { flex: 1, paddingRight: 46 }]}
        onSubmitEditing={onSubmit}
        returnKeyType="go"
      />
      <Pressable accessibilityLabel={show ? 'Hide password' : 'Show password'} onPress={() => setShow((v) => !v)} style={styles.eye} hitSlop={8}>
        {show ? <EyeOff size={18} color={colors.espressoSoft} /> : <Eye size={18} color={colors.espressoSoft} />}
      </Pressable>
    </View>
  );
}

export function AuthScreen() {
  const { signIn, signUp, sendPasswordReset, resetPasswordWithCode } = useAuthStore.getState();
  const [mode, setMode] = useState<Mode>('signIn');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const go = (m: Mode) => {
    setMode(m);
    setError(null);
    setInfo(null);
  };

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    const err = await fn();
    setBusy(false);
    if (err) setError(err);
  };

  const submit = () => {
    if (!emailOk(email)) return setError('Enter a valid email address.');
    if (mode === 'signIn') {
      if (!password) return setError('Enter your password.');
      return void run(() => signIn(email, password));
    }
    if (mode === 'signUp') {
      if (password.length < 8) return setError('Choose a password with at least 8 characters.');
      return void run(async () => {
        const res = await signUp(email, password, name);
        if (!res.error && res.needsConfirmation) {
          setMode('signIn');
          setInfo(`Almost there! We sent a confirmation link to ${email.trim()}. Open it, then sign in here.`);
        }
        return res.error;
      });
    }
    if (mode === 'forgot') {
      return void run(async () => {
        const err = await sendPasswordReset(email);
        if (!err) {
          setMode('reset');
          setInfo(`We emailed a 6-digit code to ${email.trim()}.`);
        }
        return err;
      });
    }
    if (code.trim().length < 6) return setError('Enter the 6-digit code from the email.');
    if (password.length < 8) return setError('Choose a new password with at least 8 characters.');
    return void run(() => resetPasswordWithCode(email, code, password));
  };

  const cta = { signIn: 'Sign in', signUp: 'Create my account', forgot: 'Email me a reset code', reset: 'Set new password & sign in' }[mode];

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={{ fontSize: 40 }}>✨</Text>
            </View>
            <Text style={styles.appName}>GlowUp Daily</Text>
            <Text style={styles.tagline}>20 tiny wins a day. Your routines, your goals, your glow.</Text>
          </View>

          <View style={styles.card}>
            {mode === 'signIn' || mode === 'signUp' ? (
              <Segmented
                value={mode}
                onChange={go}
                options={[
                  { value: 'signIn', label: 'Sign in' },
                  { value: 'signUp', label: 'Create account' },
                ]}
              />
            ) : (
              <Text style={styles.cardTitle}>{mode === 'forgot' ? 'Reset your password' : 'Enter your code'}</Text>
            )}

            {mode === 'signUp' ? (
              <>
                <Text style={ui.label}>Your name</Text>
                <TextInput testID="auth-name" value={name} onChangeText={setName} placeholder="Maria" placeholderTextColor={colors.muted} style={ui.input} autoComplete="name" />
              </>
            ) : null}

            <Text style={ui.label}>Email</Text>
            <TextInput
              testID="auth-email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={mode !== 'reset'}
              style={[ui.input, mode === 'reset' && { opacity: 0.6 }]}
            />

            {mode === 'reset' ? (
              <>
                <Text style={ui.label}>6-digit code</Text>
                <TextInput testID="auth-code" value={code} onChangeText={setCode} placeholder="123456" placeholderTextColor={colors.muted} keyboardType="number-pad" maxLength={10} style={ui.input} />
              </>
            ) : null}

            {mode !== 'forgot' ? (
              <>
                <Text style={ui.label}>{mode === 'reset' ? 'New password' : 'Password'}</Text>
                <PasswordInput testID="auth-password" value={password} onChange={setPassword} placeholder={mode === 'signIn' ? 'Your password' : 'At least 8 characters'} onSubmit={submit} />
              </>
            ) : null}

            {info ? (
              <Text testID="auth-info" style={styles.info}>
                {info}
              </Text>
            ) : null}
            {error ? (
              <Text testID="auth-error" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Button testID="auth-submit" label={busy ? 'One moment…' : cta} onPress={submit} disabled={busy} style={{ marginTop: 18 }} />

            {mode === 'signIn' ? (
              <Pressable testID="auth-forgot" onPress={() => go('forgot')} style={styles.link}>
                <Text style={styles.linkText}>Forgot your password?</Text>
              </Pressable>
            ) : null}
            {mode === 'forgot' || mode === 'reset' ? (
              <Pressable onPress={() => go('signIn')} style={styles.link}>
                <Text style={styles.linkText}>Back to sign in</Text>
              </Pressable>
            ) : null}
          </View>
          <Text style={styles.footer}>Your data is private to your account and syncs across your devices.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.oat },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20, width: '100%', maxWidth: 480, alignSelf: 'center' },
  brand: { alignItems: 'center', marginBottom: 22 },
  logo: { width: 84, height: 84, borderRadius: 28, backgroundColor: colors.lilacTint, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.lilac },
  appName: { fontSize: 30, fontWeight: '900', color: colors.espresso, marginTop: 12, letterSpacing: -0.6 },
  tagline: { fontSize: 14, color: colors.espressoSoft, textAlign: 'center', marginTop: 6 },
  card: { backgroundColor: colors.card, borderRadius: radius.xl, padding: 20, ...shadow },
  cardTitle: { fontSize: 18, fontWeight: '800', color: colors.espresso },
  pwRow: { flexDirection: 'row', alignItems: 'center' },
  eye: { position: 'absolute', right: 12, padding: 4 },
  info: { marginTop: 14, fontSize: 13, color: colors.espresso, backgroundColor: colors.matchaTint, padding: 10, borderRadius: radius.sm, overflow: 'hidden' },
  error: { marginTop: 14, fontSize: 13, color: colors.danger, backgroundColor: colors.peachTint, padding: 10, borderRadius: radius.sm, overflow: 'hidden' },
  link: { alignSelf: 'center', marginTop: 14, padding: 4 },
  linkText: { fontSize: 13, fontWeight: '700', color: colors.matchaDeep },
  footer: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: 18 },
});
