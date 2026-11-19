import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { colors, space } from '../../theme';
import { Avatar, Button, Field, Header, Ionicons, Screen, Txt } from '../../components/ui';
import { useStore } from '../../data/store';
import { birthdayToInput, parseBirthdayInput } from '../../lib/dates';
import type { ScreenProps } from '../../navigation/types';

export function MyDetailsScreen({ navigation }: ScreenProps<'MyDetails'>) {
  const s = useStore();
  const me = s.me!;
  const [name, setName] = useState(me.name);
  const [birthday, setBirthday] = useState(birthdayToInput(me.birthday));
  const empty = birthday.trim() === '';
  const parsed = parseBirthdayInput(birthday);
  const valid = empty || !!parsed;

  const save = () => {
    s.updateMe({ name: name.trim() || me.name, birthday: empty ? undefined : parsed ?? me.birthday });
    s.showToast('Saved.');
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header title="My details" />
        <View style={{ paddingHorizontal: space.xl }}>
          <View style={{ alignItems: 'center', paddingVertical: space.xl }}>
            <Avatar user={{ id: me.id, name: name || me.name }} size={88} />
          </View>
          <Field label="Name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field
            label="Birthday (optional)"
            placeholder="MM/DD"
            value={birthday}
            onChangeText={setBirthday}
            keyboardType="numbers-and-punctuation"
            hint={valid ? 'Just the day and month, so we can celebrate you. Leave it empty if you\'d rather not.' : 'Use this format: MM/DD'}
          />
          <Button title="Save" onPress={save} disabled={!valid || !name.trim()} />

          <View style={{ flexDirection: 'row', gap: 10, backgroundColor: colors.plumSoft, padding: 12, borderRadius: 14, marginTop: space.xl }}>
            <Ionicons name="lock-closed" size={16} color={colors.plum} style={{ marginTop: 2 }} />
            <Txt v="small" color={colors.plum} style={{ flex: 1 }}>
              That's all we keep about you. No phone number, no password, and nobody in the app can see your email.
            </Txt>
          </View>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
