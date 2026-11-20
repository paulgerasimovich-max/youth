// Человек уже вошёл, но ещё не подтвердил, что ему 13+, и не принял правила группы
// (например, создал аккаунт через «Sign in»). Без этого дальше не пускаем.

import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { colors, space } from '../../theme';
import { Button, Card, CheckRow, Screen, Txt } from '../../components/ui';
import { useStore } from '../../data/store';
import rules from '../../data/rules.json';

export function AgreeScreen() {
  const { acceptRules, signOut } = useStore();
  const [age, setAge] = useState(false);
  const [ok, setOk] = useState(false);
  return (
    <Screen>
      <View style={{ paddingTop: space.xxl * 2, paddingBottom: space.xxl }}>
        <Txt v="display">Two quick{'\n'}things</Txt>
        <Txt v="body" style={{ marginTop: space.sm, marginBottom: space.xl }}>{rules.intro}</Txt>

        <Card style={{ marginBottom: space.lg }}>
          {rules.rules.map((r) => (
            <View key={r.title} style={{ marginBottom: 10 }}>
              <Txt v="bodyBold">{r.title}</Txt>
              <Txt v="small">{r.text}</Txt>
            </View>
          ))}
          <Txt v="small" color={colors.plum}>{rules.breakText}</Txt>
        </Card>

        <CheckRow checked={age} onChange={setAge} label="I'm 13 or older" />
        <CheckRow checked={ok} onChange={setOk} label="I'll follow the group rules" />

        <Button title="I'm in" disabled={!age || !ok} onPress={acceptRules} style={{ marginTop: space.md }} />
        <Pressable onPress={signOut} style={{ paddingVertical: space.xl }}>
          <Txt v="bodyBold" center color={colors.inkSoft}>Sign out</Txt>
        </Pressable>
      </View>
    </Screen>
  );
}
