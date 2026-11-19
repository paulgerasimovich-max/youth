import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { colors, space } from '../../theme';
import { Button, Field, Header, Ionicons, Screen, Txt } from '../../components/ui';
import { useStore } from '../../data/store';
import type { ScreenProps } from '../../navigation/types';

export const looksLikeEmail = (text: string) => /^\S+@\S+\.\S+$/.test(text.trim());

export function SignUpScreen({ navigation }: ScreenProps<'SignUp'>) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const { requestCode } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ready = name.trim().length > 0 && looksLikeEmail(email);

  const send = async () => {
    setBusy(true);
    setError(null);
    const problem = await requestCode(email.trim().toLowerCase(), name.trim());
    setBusy(false);
    if (problem) setError(problem);
    else navigation.navigate('VerifyCode', { email: email.trim().toLowerCase(), name: name.trim() });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header />
        <View style={{ paddingHorizontal: space.xl }}>
          <Txt v="display">Join the{'\n'}group</Txt>
          <Txt v="body" style={{ marginTop: space.sm, marginBottom: space.xxl }}>
            Just your name and email. No password to remember.
          </Txt>

          <Field label="Name" placeholder="First and last name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {error ? <Txt v="smallBold" color={colors.danger} style={{ marginBottom: space.md }}>{error}</Txt> : null}
          <Button title={busy ? 'Sending...' : 'Send me a code'} icon="mail" disabled={!ready || busy} onPress={send} style={{ marginTop: space.sm }} />

          <View style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.plumSoft, padding: 12, borderRadius: 14, marginTop: space.xl }}>
            <Ionicons name="lock-closed" size={16} color={colors.plum} style={{ marginTop: 2 }} />
            <Txt v="small" color={colors.plum} style={{ flex: 1 }}>
              We only use your email to send you a sign-in code. Nobody in the app can see it, and we never ask for your phone number.
            </Txt>
          </View>

          <Pressable onPress={() => navigation.replace('SignIn')} style={{ paddingVertical: space.xl }}>
            <Txt v="bodyBold" center color={colors.accent}>I already have an account</Txt>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
