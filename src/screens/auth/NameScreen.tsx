// Человек вошёл по коду, но ещё не назвал себя — спрашиваем имя.

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { colors, space } from '../../theme';
import { Button, Field, Screen, Txt } from '../../components/ui';
import { useStore } from '../../data/store';

export function NameScreen() {
  const { updateMe, signOut } = useStore();
  const [name, setName] = useState('');
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={{ paddingTop: space.xxl * 2 }}>
          <Txt v="display">What should{'\n'}we call you?</Txt>
          <Txt v="body" style={{ marginTop: space.sm, marginBottom: space.xxl }}>
            This is the name people in the group will see.
          </Txt>
          <Field label="Name" placeholder="First and last name" value={name} onChangeText={setName} autoCapitalize="words" autoFocus />
          <Button title="That's me" disabled={!name.trim()} onPress={() => updateMe({ name: name.trim() })} />
          <Pressable onPress={signOut} style={{ paddingVertical: space.xl }}>
            <Txt v="bodyBold" center color={colors.inkSoft}>Sign out</Txt>
          </Pressable>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
