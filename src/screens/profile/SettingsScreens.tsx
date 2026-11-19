// Уведомления, конфиденциальность, заблокированные.

import React from 'react';
import { View } from 'react-native';
import { colors, space } from '../../theme';
import { Avatar, Button, Card, Empty, Header, Ionicons, Screen, ToggleRow, Txt } from '../../components/ui';
import { useStore } from '../../data/store';

export function NotificationsScreen() {
  const { notif, setNotif } = useStore();
  return (
    <Screen padded={false}>
      <Header title="Notifications" />
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm }}>
        <Card style={{ paddingVertical: 4 }}>
          <ToggleRow title="Daily word" subtitle="A short word each day" value={notif.dailyWord} onChange={(v) => setNotif({ dailyWord: v })} />
          <ToggleRow title="Group chat" subtitle="New messages" value={notif.chat} onChange={(v) => setNotif({ chat: v })} />
          <ToggleRow title="Events" subtitle="New events and reminders" value={notif.events} onChange={(v) => setNotif({ events: v })} />
          <ToggleRow title="Birthdays" subtitle="Notes sent to you on your day" value={notif.birthdays} onChange={(v) => setNotif({ birthdays: v })} last />
        </Card>
        <Card bg={colors.plumSoft} style={{ marginTop: space.lg, flexDirection: 'row', gap: 10 }}>
          <Ionicons name="eye-off" size={18} color={colors.plum} />
          <Txt v="small" color={colors.plum} style={{ flex: 1 }}>
            We never send a notification when a leader answers your anonymous question. That keeps it private. Just check the Ask tab.
          </Txt>
        </Card>
      </View>
    </Screen>
  );
}

export function PrivacyScreen() {
  const { showToast } = useStore();
  const blocks = [
    { title: 'What we keep', text: 'Just your name, and your birthday if you choose to add it (day and month only). We never ask for a phone number or a password. Your email is used only to send your sign-in code, and nobody in the app can see it.' },
    { title: 'Anonymous questions', text: 'These are never linked to your account. The key to your question lives only on your phone. They are deleted 7 days after the last message, or right away if you tap Delete.' },
    { title: 'You\'re in control', text: 'You can report or block anyone, and you can delete your account at any time from your profile. When you do, your stuff goes with it.' },
  ];
  return (
    <Screen padded={false}>
      <Header title="Privacy" />
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm }}>
        {blocks.map((b) => (
          <Card key={b.title} style={{ marginBottom: space.md }}>
            <Txt v="title">{b.title}</Txt>
            <Txt v="body" style={{ marginTop: 4 }}>{b.text}</Txt>
          </Card>
        ))}
        <Button title="Read the full Privacy Policy" icon="open-outline" variant="outline" onPress={() => showToast('The policy page will open here.')} />
      </View>
    </Screen>
  );
}

export function BlockedScreen() {
  const s = useStore();
  return (
    <Screen padded={false}>
      <Header title="Blocked people" />
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm }}>
        {s.blocked.length === 0 ? (
          <Empty emoji="🕊️" title="You haven't blocked anyone" text="If someone bothers you, tap their message and choose Block." />
        ) : (
          <Card style={{ paddingVertical: 4 }}>
            {s.blocked.map((id, i) => {
              const u = s.userById(id);
              return (
                <View
                  key={id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12,
                    borderBottomWidth: i === s.blocked.length - 1 ? 0 : 1, borderBottomColor: colors.line,
                  }}
                >
                  <Avatar user={u} size={38} />
                  <Txt v="bodyBold" style={{ flex: 1 }}>{u?.name ?? 'Someone'}</Txt>
                  <Button title="Unblock" small variant="outline" full={false} onPress={() => s.unblock(id)} />
                </View>
              );
            })}
          </Card>
        )}
      </View>
    </Screen>
  );
}
