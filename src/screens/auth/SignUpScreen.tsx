import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { colors, space } from '../../theme';
import { Button, Field, Header, Screen, Txt } from '../../components/ui';
import { useStore } from '../../data/store';
import { parseBirthdayInput, todayISO } from '../../lib/dates';
import type { ScreenProps } from '../../navigation/types';

export function SignUpScreen({ navigation }: ScreenProps<'SignUp'>) {
  const { signUp } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const [password, setPassword] = useState('');

  const submit = () =>
    signUp({
      name: name.trim() || 'Alex Carter',
      email: email.trim() || 'alex@example.com',
      phone: phone.trim() || '(555) 010-2030',
      birthday: parseBirthdayInput(birthday) ?? todayISO().replace(/^\d{4}/, '2008'),
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header />
        <View style={{ paddingHorizontal: space.xl }}>
          <Txt v="display">Join the{'\n'}group</Txt>
          <Txt v="body" style={{ marginTop: space.sm, marginBottom: space.xxl }}>
            Takes a minute. No approval needed.
          </Txt>

          <Field label="Name" placeholder="First and last name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Email" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone" placeholder="(555) 000-0000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field
            label="Birthday"
            placeholder="MM/DD/YYYY"
            value={birthday}
            onChangeText={setBirthday}
            keyboardType="numbers-and-punctuation"
            hint="So we can celebrate you 🎂"
          />
          <Field label="Password" placeholder="At least 8 characters" value={password} onChangeText={setPassword} secureTextEntry />

          <Button title="Create account" onPress={submit} style={{ marginTop: space.sm }} />
          <Txt v="small" center style={{ marginTop: space.lg }}>
            By joining you agree to our Terms and Privacy Policy.
          </Txt>
          <Pressable onPress={() => navigation.replace('SignIn')} style={{ paddingVertical: space.lg }}>
            <Txt v="bodyBold" center color={colors.accent}>I already have an account</Txt>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
