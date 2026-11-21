// Переписка по анонимному вопросу — и для участника, и для лидера.

import React, { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, space } from '../theme';
import { Avatar, Composer, Empty, Header, IconButton, Ionicons, RoleBadge, Txt } from '../components/ui';
import { useOverlay } from '../components/overlay';
import { useStore } from '../data/store';
import { deletesInLabel, timeAgo } from '../lib/dates';
import type { ScreenProps } from '../navigation/types';

export function ThreadScreen({ route, navigation }: ScreenProps<'Thread'>) {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const { openSheet } = useOverlay();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const { threadId, asLeader } = route.params;
  const thread = s.db.threads.find((t) => t.id === threadId);
  const count = thread?.messages.length ?? 0;
  const { markThreadSeen } = s;

  useEffect(() => {
    if (!asLeader) markThreadSeen(threadId);
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 60);
    return () => clearTimeout(t);
  }, [count, asLeader, threadId, markThreadSeen]);

  if (!thread) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <Header />
        <Empty emoji="🧹" title="This conversation is gone" text="It was deleted for good." />
      </View>
    );
  }
  const closed = thread.status === 'closed';
  const me = s.me!;

  const confirmDelete = () =>
    openSheet({
      title: 'Delete this conversation?',
      message: 'It disappears for you and for the leaders. This can\'t be undone.',
      options: [{ label: 'Delete now', icon: 'trash-outline', danger: true, onPress: () => { navigation.goBack(); s.deleteThread(thread.id); } }],
      cancelLabel: 'Keep it',
    });
  const confirmClose = () =>
    openSheet({
      title: 'Close this conversation?',
      message: 'No one will be able to write here anymore. Use this if someone is being rude or trolling.',
      options: [{ label: 'Close conversation', icon: 'lock-closed-outline', danger: true, onPress: () => s.closeThread(thread.id) }],
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header
        title={asLeader ? 'Anonymous question' : 'Your question'}
        right={
          asLeader
            ? closed ? undefined : <IconButton icon="lock-closed-outline" onPress={confirmClose} label="Close conversation" />
            : <IconButton icon="trash-outline" color={colors.danger} onPress={confirmDelete} label="Delete now" />
        }
      />
      <View style={styles.strip}>
        <Ionicons name="eye-off" size={14} color={colors.plum} />
        <Txt v="smallBold" color={colors.plum}>Anonymous</Txt>
        <Txt v="small" color={colors.plum}>·</Txt>
        <Ionicons name="timer-outline" size={14} color={colors.plum} />
        <Txt v="small" color={colors.plum}>{deletesInLabel(thread.lastMessageAt)}</Txt>
      </View>

      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: space.lg, paddingBottom: space.xxl }}>
        {asLeader && thread.preferredLeaderId ? (
          <View style={styles.pref}>
            <Txt v="small" center color={colors.inkSoft}>
              They'd like {thread.preferredLeaderId === me.id ? 'you' : s.nameOf(thread.preferredLeaderId).split(' ')[0]} to answer, but anyone can.
            </Txt>
          </View>
        ) : null}

        {thread.messages.map((m) => {
          const fromAsker = m.from === 'asker';
          const right = asLeader ? m.from === me.id : fromAsker;
          const leader = fromAsker ? undefined : s.userById(m.from);
          return (
            <View key={m.id} style={[styles.row, right ? { justifyContent: 'flex-end' } : null]}>
              {!right ? <Avatar user={leader} size={34} /> : null}
              <View style={{ maxWidth: '80%', alignItems: right ? 'flex-end' : 'flex-start' }}>
                {!right ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 4 }}>
                    <Txt v="smallBold">{leader ? leader.name : 'Anonymous'}</Txt>
                    {leader ? <RoleBadge role={leader.role} pastor={leader.pastor} /> : null}
                  </View>
                ) : null}
                <View style={[styles.bubble, right ? styles.mine : styles.theirs]}>
                  <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: right ? colors.white : colors.ink }}>{m.body}</Text>
                </View>
                <Txt v="small" style={{ fontSize: 11, marginTop: 3, marginHorizontal: 4 }}>{timeAgo(m.createdAt)}</Txt>
              </View>
            </View>
          );
        })}

        {closed ? (
          <View style={styles.closed}>
            <Ionicons name="lock-closed" size={16} color={colors.inkSoft} />
            <Txt v="smallBold" color={colors.inkSoft}>A leader closed this conversation.</Txt>
          </View>
        ) : null}
      </ScrollView>

      {closed ? (
        <View style={{ height: Math.max(insets.bottom, 12) }} />
      ) : (
        <>
          {asLeader ? (
            <Txt v="small" center style={{ paddingVertical: 6, backgroundColor: colors.surface }}>They'll see your name on the reply.</Txt>
          ) : null}
          <Composer
            placeholder={asLeader ? `Reply as ${me.name.split(' ')[0]}...` : 'Write back...'}
            onSend={(text) => (asLeader ? s.replyAsLeader(thread.id, text) : s.replyAsAsker(thread.id, text))}
          />
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.plumSoft, paddingVertical: 8,
  },
  pref: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 10, marginBottom: space.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  bubble: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 20 },
  theirs: { backgroundColor: colors.surface, borderTopLeftRadius: 6 },
  mine: { backgroundColor: colors.plum, borderTopRightRadius: 6 },
  closed: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.line, padding: 12, borderRadius: radius.md,
    marginTop: space.sm,
  },
});
