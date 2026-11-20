// Правила группы. Их принимают при регистрации; потом их можно перечитать из профиля.
// Тот же текст (src/data/rules.json) попадает на сайт — npm run site:build.

import React from 'react';
import { View } from 'react-native';
import rules from '../data/rules.json';
import { colors, space } from '../theme';
import { Card, Header, Screen, Txt } from '../components/ui';

export function RulesScreen() {
  return (
    <Screen padded={false}>
      <Header title={rules.title} />
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xxl }}>
        <Txt v="body" style={{ marginBottom: space.lg }}>{rules.intro}</Txt>
        {rules.rules.map((r, i) => (
          <Card key={r.title} style={{ marginBottom: space.md, flexDirection: 'row', gap: 14 }}>
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.sunSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Txt v="bodyBold">{i + 1}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="title">{r.title}</Txt>
              <Txt v="body" style={{ marginTop: 2 }}>{r.text}</Txt>
            </View>
          </Card>
        ))}
        <Card bg={colors.plumSoft} style={{ marginTop: space.sm }}>
          <Txt v="title" color={colors.plum}>{rules.breakTitle}</Txt>
          <Txt v="body" color={colors.plum} style={{ marginTop: 4 }}>{rules.breakText}</Txt>
        </Card>
        <Txt v="small" center style={{ marginTop: space.lg }}>{rules.age}</Txt>
      </View>
    </Screen>
  );
}
