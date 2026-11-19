import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { space } from '../../theme';
import { Avatar, Button, Field, Header, Screen } from '../../components/ui';
import { useStore } from '../../data/store';
import { birthdayToInput, parseBirthdayInput } from '../../lib/dates';
import type { ScreenProps } from '../../navigation/types';

export function MyDetailsScreen({ navigation }: ScreenProps<'MyDetails'>) {
  const s = useStore();
  const me = s.me!;
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email);
  const [phone, setPhone] = useState(me.phone);
  const [birthday, setBirthday] = useState(birthdayToInput(me.birthday));
  const parsed = parseBirthdayInput(birthday);

  const save = () => {
    s.updateMe({ name: name.trim() || me.name, email: email.trim(), phone: phone.trim(), birthday: parsed ?? me.birthday });
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
          <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field
            label="Birthday"
            placeholder="MM/DD/YYYY"
            value={birthday}
            onChangeText={setBirthday}
            keyboardType="numbers-and-punctuation"
            hint={parsed ? undefined : 'Use this format: MM/DD/YYYY'}
          />
          <Button title="Save" onPress={save} disabled={!parsed} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
