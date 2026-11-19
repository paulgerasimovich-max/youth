import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { colors, space } from '../theme';
import { Button, Chip, Field, Header, Ionicons, Screen, Txt } from '../components/ui';
import { useStore } from '../data/store';
import type { ScreenProps } from '../navigation/types';

export function AskQuestionScreen({ navigation }: ScreenProps<'AskQuestion'>) {
  const s = useStore();
  const [body, setBody] = useState('');
  const [leaderId, setLeaderId] = useState<string | undefined>(undefined);
  const leaders = s.db.users.filter((u) => u.role !== 'member' && u.id !== s.me!.id);

  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true);
    const id = await s.askQuestion(body.trim(), leaderId);
    setBusy(false);
    if (id) navigation.replace('Thread', { threadId: id });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header title="Ask a question" />
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.plumSoft, padding: 12, borderRadius: 14, marginBottom: space.xl }}>
            <Ionicons name="eye-off" size={18} color={colors.plum} />
            <Txt v="smallBold" color={colors.plum} style={{ flex: 1 }}>Your name is never attached. Say it how it is.</Txt>
          </View>

          <Field
            label="What's on your mind?"
            placeholder="Type it out. No one will know it's you."
            value={body}
            onChangeText={setBody}
            multiline
            style={{ minHeight: 170 }}
          />

          <Txt v="label" style={{ marginBottom: 8 }}>Want someone specific to answer? (optional)</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="Any leader" active={!leaderId} onPress={() => setLeaderId(undefined)} />
            {leaders.map((l) => (
              <Chip key={l.id} label={l.name.split(' ')[0]} active={leaderId === l.id} onPress={() => setLeaderId(l.id)} />
            ))}
          </View>
          <Txt v="small" style={{ marginTop: 8, marginBottom: space.xxl }}>
            All leaders will still see your question. That keeps everyone safe.
          </Txt>

          <Button title={busy ? 'Sending...' : 'Send anonymously'} icon="eye-off" onPress={send} disabled={!body.trim() || busy} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
