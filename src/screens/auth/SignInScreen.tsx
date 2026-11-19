import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { colors, space } from '../../theme';
import { Button, Field, Header, Screen, Txt } from '../../components/ui';
import type { ScreenProps } from '../../navigation/types';
import { looksLikeEmail } from './SignUpScreen';

export function SignInScreen({ navigation }: ScreenProps<'SignIn'>) {
  const [email, setEmail] = useState('alex@example.com');

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

          <Button
            title="Send me a code"
            icon="mail"
            disabled={!looksLikeEmail(email)}
            onPress={() => navigation.navigate('VerifyCode', { email: email.trim() })}
            style={{ marginTop: space.sm }}
          />
          <Pressable onPress={() => navigation.replace('SignUp')} style={{ paddingVertical: space.xl }}>
            <Txt v="bodyBold" center color={colors.accent}>New here? Join the group</Txt>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
