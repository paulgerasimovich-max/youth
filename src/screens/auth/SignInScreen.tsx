import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { colors, space } from '../../theme';
import { Button, Field, Header, Screen, Txt } from '../../components/ui';
import { useStore } from '../../data/store';
import type { ScreenProps } from '../../navigation/types';
import { looksLikeEmail } from './SignUpScreen';

export function SignInScreen({ navigation }: ScreenProps<'SignIn'>) {
  const { requestCode, isDemo } = useStore();
  const [email, setEmail] = useState(isDemo ? 'alex@example.com' : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const address = email.trim().toLowerCase();
    setBusy(true);
    setError(null);
    const problem = await requestCode(address);
    setBusy(false);
    if (problem) setError(problem);
    else navigation.navigate('VerifyCode', { email: address });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header />
        <View style={{ paddingHorizontal: space.xl }}>
          <Txt v="display">Welcome{'\n'}back</Txt>
          <Txt v="body" style={{ marginTop: space.sm, marginBottom: space.xxl }}>
            Type your email and we'll send you a code.
          </Txt>

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
          <Button title={busy ? 'Sending...' : 'Send me a code'} icon="mail" disabled={!looksLikeEmail(email) || busy} onPress={send} style={{ marginTop: space.sm }} />
          <Pressable onPress={() => navigation.replace('SignUp')} style={{ paddingVertical: space.xl }}>
            <Txt v="bodyBold" center color={colors.accent}>New here? Join the group</Txt>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
