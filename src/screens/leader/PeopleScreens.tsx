// Лидерам: участники, дни рождения, поздравления.

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from 'react-native';
import { colors, space } from '../../theme';
import { Avatar, Button, Card, Chip, Field, Header, IconButton, Ionicons, RoleBadge, Screen, Txt } from '../../components/ui';
import { useOverlay } from '../../components/overlay';
import { useStore } from '../../data/store';
import { birthdayLabel, daysUntilBirthday, parseBirthdayInput } from '../../lib/dates';
import type { User } from '../../data/types';
import type { ScreenProps } from '../../navigation/types';

const roleOrder = { admin: 0, leader: 1, member: 2 } as const;

export function MembersScreen({ navigation }: ScreenProps<'Members'>) {
  const s = useStore();
  const { openSheet } = useOverlay();
  const people = [...s.db.users].sort((a, b) => roleOrder[a.role] - roleOrder[b.role] || a.name.localeCompare(b.name));

  const manage = (u: User) => {
    if (!s.isAdmin || u.role === 'admin' || u.id === s.me!.id) return;
    const first = u.name.split(' ')[0];
    openSheet({
      title: u.name,
      options: [
        u.role === 'member'
          ? { label: `Make ${first} a leader`, icon: 'star-outline', onPress: () => { s.setUserRole(u.id, 'leader'); s.showToast(`${first} is now a leader.`); } }
          : { label: `Remove ${first} as a leader`, icon: 'remove-circle-outline', danger: true, onPress: () => { s.setUserRole(u.id, 'member'); s.showToast(`${first} is a member again.`); } },
      ],
    });
  };

  return (
    <Screen padded={false}>
      <Header
        title="Members"
        right={<IconButton icon="person-add" bg={colors.accent} color={colors.white} onPress={() => navigation.navigate('MemberForm')} label="Add someone" />}
      />
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm }}>
        <Txt v="small" style={{ marginBottom: space.md }}>
          {s.isAdmin ? 'Tap someone to make them a leader.' : 'Only the lead pastor can pick leaders.'}
        </Txt>
        <Card style={{ paddingVertical: 4 }}>
          {people.map((u, i) => {
            const canManage = s.isAdmin && u.role !== 'admin' && u.id !== s.me!.id;
            return (
              <Pressable
                key={u.id}
                onPress={() => manage(u)}
                disabled={!canManage}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 11,
                  borderBottomWidth: i === people.length - 1 ? 0 : 1, borderBottomColor: colors.line,
                }}
              >
                <Avatar user={u} size={40} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Txt v="bodyBold">{u.name}{u.id === s.me!.id ? ' (you)' : ''}</Txt>
                    <RoleBadge role={u.role} />
                  </View>
                  <Txt v="small">{u.phone}</Txt>
                </View>
                {canManage ? <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} /> : null}
              </Pressable>
            );
          })}
        </Card>
      </View>
    </Screen>
  );
}

export function MemberFormScreen({ navigation }: ScreenProps<'MemberForm'>) {
  const s = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [birthday, setBirthday] = useState('');
  const parsed = parseBirthdayInput(birthday);
  const save = () => {
    s.addMember({ name: name.trim(), email: email.trim(), phone: phone.trim(), birthday: parsed ?? '2009-01-01' });
    s.showToast(`${name.trim().split(' ')[0]} was added. We sent them an invite.`);
    navigation.goBack();
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header title="Add someone" />
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
          <Txt v="body" style={{ marginBottom: space.xl }}>They'll get an invite to set their own password.</Txt>
          <Field label="Name" placeholder="First and last name" value={name} onChangeText={setName} autoCapitalize="words" />
          <Field label="Email" placeholder="them@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone" placeholder="(555) 000-0000" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field label="Birthday" placeholder="MM/DD/YYYY" value={birthday} onChangeText={setBirthday} keyboardType="numbers-and-punctuation" />
          <Button title="Add to the group" onPress={save} disabled={!name.trim() || !email.trim()} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function BirthdaysScreen({ navigation }: ScreenProps<'Birthdays'>) {
  const s = useStore();
  const people = s.db.users
    .filter((u) => u.id !== s.me!.id)
    .map((u) => ({ u, days: daysUntilBirthday(u.birthday) }))
    .sort((a, b) => a.days - b.days);
  return (
    <Screen padded={false}>
      <Header title="Birthdays" />
      <View style={{ paddingHorizontal: space.xl, paddingTop: space.sm }}>
        {people.map(({ u, days }) => {
          const today = days === 0;
          const sent = s.db.greetings.some((g) => g.toUserId === u.id && g.fromUserId === s.me!.id);
          return (
            <Card key={u.id} bg={today ? colors.sunSoft : colors.surface} style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
              <Avatar user={u} size={44} />
              <View style={{ flex: 1 }}>
                <Txt v="bodyBold">{u.name}</Txt>
                <Txt v="small" color={today ? '#8A6300' : undefined}>
                  {birthdayLabel(u.birthday)} · {today ? 'today 🎂' : days === 1 ? 'tomorrow' : `in ${days} days`}
                </Txt>
              </View>
              {sent ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.green} />
                  <Txt v="smallBold" color={colors.green}>Sent</Txt>
                </View>
              ) : days <= 7 ? (
                <Button title="Send a note" small variant={today ? 'dark' : 'soft'} full={false} onPress={() => navigation.navigate('GreetingForm', { userId: u.id })} />
              ) : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

export function GreetingFormScreen({ route, navigation }: ScreenProps<'GreetingForm'>) {
  const s = useStore();
  const user = s.userById(route.params.userId);
  const first = user?.name.split(' ')[0] ?? 'friend';
  const ideas = [
    `Happy birthday, ${first}! So glad you're part of this group. 🎉`,
    `${first}, happy birthday! Praying this year is full of good things.`,
    `It's your day, ${first}! We're cheering for you.`,
  ];
  const [body, setBody] = useState(ideas[0]);
  const send = () => {
    s.sendGreeting(route.params.userId, body.trim());
    s.showToast(`Sent! ${first} will get a notification.`);
    navigation.goBack();
  };
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header title="Birthday note" />
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
          <View style={{ alignItems: 'center', marginBottom: space.xl }}>
            <Avatar user={user} size={76} />
            <Text style={{ fontSize: 28, marginTop: -14, marginLeft: 56 }}>🎂</Text>
            <Txt v="h1" style={{ marginTop: 2 }}>{user?.name}</Txt>
            <Txt v="small">Only {first} will see this.</Txt>
          </View>
          <Field label="Your note" value={body} onChangeText={setBody} multiline />
          <Txt v="label" style={{ marginBottom: 8 }}>Need a start?</Txt>
          <View style={{ gap: 8, marginBottom: space.xl }}>
            {ideas.map((t, i) => (
              <Chip key={i} label={t.length > 40 ? `${t.slice(0, 40)}...` : t} active={body === t} onPress={() => setBody(t)} />
            ))}
          </View>
          <Button title="Send note" icon="gift" onPress={send} disabled={!body.trim()} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
