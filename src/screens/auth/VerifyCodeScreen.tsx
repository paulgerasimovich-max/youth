// Ввод одноразового кода из письма. Пароля в приложении нет вообще.

import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Header, Screen, Txt } from '../../components/ui';
import { useStore } from '../../data/store';
import type { ScreenProps } from '../../navigation/types';

const LENGTH = 6;

export function VerifyCodeScreen({ route, navigation }: ScreenProps<'VerifyCode'>) {
  const { verifyCode, requestCode, showToast, isDemo } = useStore();
  const { email, name } = route.params;
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

  const finish = async () => {
    setBusy(true);
    setError(null);
    const problem = await verifyCode(email, code, name);
    if (problem) {
      // при успехе экран сам сменится на приложение
      setBusy(false);
      setError(problem);
      setCode('');
    }
  };
  const resend = async () => {
    setCode('');
    setError(null);
    const problem = await requestCode(email, name);
    showToast(problem ?? 'New code sent. Check your email.');
  };
  const onChange = (text: string) => {
    setError(null);
    setCode(text.replace(/\D/g, '').slice(0, LENGTH));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header />
        <View style={{ paddingHorizontal: space.xl }}>
          <Txt v="display">Check your{'\n'}email</Txt>
          <Txt v="body" style={{ marginTop: space.sm }}>We sent a 6-digit code to</Txt>
          <Txt v="bodyBold" style={{ marginBottom: space.xxl }}>{email}</Txt>

          <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxes} accessibilityLabel="Code">
            {Array.from({ length: LENGTH }, (_, i) => {
              const active = i === Math.min(code.length, LENGTH - 1);
              return (
                <View key={i} style={[styles.box, code[i] ? styles.boxFilled : null, active ? styles.boxActive : null]}>
                  <Text style={styles.digit}>{code[i] ?? ''}</Text>
                </View>
              );
            })}
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={onChange}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              autoFocus
              maxLength={LENGTH}
              caretHidden
              style={styles.hiddenInput}
            />
          </Pressable>

          {error ? <Txt v="smallBold" color={colors.danger} style={{ marginTop: space.md }}>{error}</Txt> : null}
          <Button title={busy ? 'Checking...' : 'Let me in'} onPress={finish} disabled={code.length < LENGTH || busy} style={{ marginTop: space.xl }} />

          <Pressable onPress={resend} style={{ paddingTop: space.xl }}>
            <Txt v="bodyBold" center color={colors.accent}>Send a new code</Txt>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} style={{ paddingVertical: space.lg }}>
            <Txt v="bodyBold" center color={colors.inkSoft}>Use a different email</Txt>
          </Pressable>
          <Txt v="small" center>
            {isDemo ? 'Demo mode: any 6 digits will work.' : "Can't find it? Check your spam folder."}
          </Txt>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  boxes: { flexDirection: 'row', gap: 8 },
  box: {
    flex: 1, height: 62, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  boxFilled: { borderColor: colors.ink },
  boxActive: { borderColor: colors.accent },
  digit: { fontFamily: fonts.display, fontSize: 24, color: colors.ink },
  // Настоящее поле ввода лежит поверх клеток и невидимо: так работают и вставка кода,
  // и автоподстановка кода из письма на телефоне.
  hiddenInput: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.01, color: 'transparent' },
});
