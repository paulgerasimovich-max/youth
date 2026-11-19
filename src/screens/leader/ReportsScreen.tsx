// Лидерам: жалобы на сообщения, комментарии и идеи.

import React from 'react';
import { View } from 'react-native';
import { colors, radius, space } from '../../theme';
import { Button, Card, Empty, Header, Ionicons, Screen, Txt } from '../../components/ui';
import { useStore } from '../../data/store';
import { timeAgo } from '../../lib/dates';
import type { Report } from '../../data/types';

const what: Record<Report['targetType'], string> = { chat: 'a chat message', comment: 'a comment', idea: 'an idea' };

export function ReportsScreen() {
  const s = useStore();
  const open = s.db.reports.filter((r) => !r.resolved);
  const done = s.db.reports.filter((r) => r.resolved);

  const authorOf = (r: Report): string | undefined => {
    if (r.targetType === 'chat') return s.db.chat.find((m) => m.id === r.targetId)?.userId;
    if (r.targetType === 'comment') return s.db.comments.find((c) => c.id === r.targetId)?.userId;
    return s.db.ideas.find((i) => i.id === r.targetId)?.userId;
  };

  return (
    <Screen padded={false}>
      <Header title="Reports" />
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm }}>
        {open.length === 0 ? <Empty emoji="✅" title="Nothing to review" text="When someone flags something, it shows up here." /> : null}
        {open.map((r) => {
          const authorId = authorOf(r);
          return (
            <Card key={r.id} style={{ marginBottom: space.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="flag" size={16} color={colors.danger} />
                <Txt v="smallBold" style={{ flex: 1 }}>{s.nameOf(r.reporterId).split(' ')[0]} flagged {what[r.targetType]}</Txt>
                <Txt v="small">{timeAgo(r.createdAt)}</Txt>
              </View>
              <View style={{ backgroundColor: colors.bg, borderRadius: radius.md, padding: 12, marginTop: space.md }}>
                {authorId ? <Txt v="smallBold">{s.nameOf(authorId)} wrote:</Txt> : <Txt v="smallBold">Already removed</Txt>}
                <Txt v="body" style={{ marginTop: 2 }}>{r.preview}</Txt>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: space.md }}>
                <Button title="Remove it" icon="trash" variant="danger" small style={{ flex: 1 }} onPress={() => { s.resolveReport(r.id, true); s.showToast('Removed.'); }} />
                <Button title="It's fine" variant="outline" small style={{ flex: 1 }} onPress={() => s.resolveReport(r.id, false)} />
              </View>
            </Card>
          );
        })}
        {done.length > 0 ? (
          <>
            <Txt v="label" style={{ marginTop: space.lg, marginBottom: space.sm }}>Handled</Txt>
            {done.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 }}>
                <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                <Txt v="small" numberOfLines={1} style={{ flex: 1 }}>{r.preview}</Txt>
              </View>
            ))}
          </>
        ) : null}
      </View>
    </Screen>
  );
}
