import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { space } from '../theme';
import { Button, Field, Header, Screen, Txt } from '../components/ui';
import { useStore } from '../data/store';
import type { ScreenProps } from '../navigation/types';

export function IdeaFormScreen({ navigation }: ScreenProps<'IdeaForm'>) {
  const s = useStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const save = () => {
    s.addIdea(title.trim(), body.trim());
    s.showToast('Idea posted. Let\'s see who\'s in!');
    navigation.goBack();
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header title="Share an idea" />
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
          <Txt v="body" style={{ marginBottom: space.xl }}>
            What would be fun to do together? Everyone can vote on it.
          </Txt>
          <Field label="Your idea" placeholder="Bowling night" value={title} onChangeText={setTitle} />
          <Field label="A bit more (optional)" placeholder="Where, when, why it'd be great." value={body} onChangeText={setBody} multiline />
          <Button title="Post idea" onPress={save} disabled={!title.trim()} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
