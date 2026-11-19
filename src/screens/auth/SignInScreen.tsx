import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { colors, space } from '../../theme';
import { Button, Field, Header, Screen, Txt } from '../../components/ui';
import { useStore } from '../../data/store';
import type { ScreenProps } from '../../navigation/types';

export function SignInScreen({ navigation }: ScreenProps<'SignIn'>) {
  const { signIn, showToast } = useStore();
  const [email, setEmail] = useState('alex@example.com');
  const [password, setPassword] = useState('demo-password');

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header />
        <View style={{ paddingHorizontal: space.xl }}>
          <Txt v="display">Welcome{'\n'}back</Txt>
          <Txt v="body" style={{ marginTop: space.sm, marginBottom: space.xxl }}>
            Good to see you again.
          </Txt>

          <Field label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Password" placeholder="Your password" value={password} onChangeText={setPassword} secureTextEntry />

          <Button title="Sign in" onPress={signIn} style={{ marginTop: space.sm }} />
          <Pressable onPress={() => showToast('We sent you a reset link. Check your email.')} style={{ paddingVertical: space.lg }}>
            <Txt v="bodyBold" center color={colors.inkSoft}>Forgot password?</Txt>
          </Pressable>
          <Pressable onPress={() => navigation.replace('SignUp')}>
            <Txt v="bodyBold" center color={colors.accent}>New here? Create an account</Txt>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
