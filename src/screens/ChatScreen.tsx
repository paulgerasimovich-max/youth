// Общий чат: сообщения, фото/видео, реакции, переслать, пожаловаться, заблокировать.

import React, { useEffect, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, radius, space } from '../theme';
import { Avatar, AvatarStack, Composer, Ionicons, MediaTile, RoleBadge, Txt } from '../components/ui';
import { SheetOption, useOverlay } from '../components/overlay';
import { REACTION_EMOJIS, useStore } from '../data/store';
import { formatDayShort, formatTime, toISODate, todayISO } from '../lib/dates';
import type { ChatMessage } from '../data/types';

export function ChatScreen() {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const { openSheet } = useOverlay();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const messages = s.db.chat.filter((m) => !s.blocked.includes(m.userId));

  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 60);
    return () => clearTimeout(t);
  }, [messages.length]);

  const share = async (kind: 'photo' | 'video') => {
    const [media] = await s.pickMedia(kind);
    if (media) s.sendChat({ media });
  };
  const attach = () =>
    openSheet({
      title: 'Share something',
      options: [
        { label: 'Photo', icon: 'image-outline', onPress: () => share('photo') },
        { label: 'Video', icon: 'videocam-outline', onPress: () => share('video') },
      ],
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View style={{ flex: 1 }}>
          <Txt v="h1">Group chat</Txt>
          <Txt v="small">{s.db.users.length === 1 ? '1 person' : `${s.db.users.length} people`}</Txt>
        </View>
        <AvatarStack users={s.db.users.slice(1, 6)} max={4} size={30} ring={colors.bg} />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingVertical: space.md }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const prev = messages[index - 1];
          const day = toISODate(new Date(item.createdAt));
          const newDay = !prev || toISODate(new Date(prev.createdAt)) !== day;
          return (
            <>
              {newDay ? (
                <View style={styles.dayPill}>
                  <Txt v="smallBold" color={colors.muted}>{day === todayISO() ? 'Today' : formatDayShort(day)}</Txt>
                </View>
              ) : null}
              <Bubble message={item} showAuthor={newDay || prev?.userId !== item.userId} />
            </>
          );
        }}
      />

      <Composer
        bottomInset={false}
        placeholder="Message..."
        onSend={(text) => s.sendChat({ body: text })}
        left={
          <Pressable onPress={attach} style={styles.attach} accessibilityLabel="Add photo or video">
            <Ionicons name="add" size={24} color={colors.ink} />
          </Pressable>
        }
      />
    </KeyboardAvoidingView>
  );
}

function Bubble({ message, showAuthor }: { message: ChatMessage; showAuthor: boolean }) {
  const nav = useNavigation();
  const s = useStore();
  const { openSheet, closeSheet } = useOverlay();
  const me = s.me!;
  const mine = message.userId === me.id;
  const user = s.userById(message.userId);
  const firstName = user?.name.split(' ')[0] ?? 'user';
  const reactions = Object.entries(message.reactions).filter(([, ids]) => ids.length > 0);

  const menu = () => {
    const options: SheetOption[] = [];
    const media = message.media;
    if (media?.uri && !media.local) {
      options.push({
        label: media.kind === 'video' ? 'Play video' : 'Open photo',
        icon: media.kind === 'video' ? 'play-outline' : 'expand-outline',
        onPress: () => nav.navigate('MediaView', { kind: media.kind, uri: media.uri!, path: media.path }),
      });
    }
    options.push(
      {
        label: 'Forward',
        icon: 'arrow-redo-outline',
        onPress: () => {
          s.sendChat({ body: message.body, media: message.media, forwardedFrom: message.forwardedFrom ?? user?.name ?? 'Someone' });
          s.showToast('Forwarded to the chat.');
        },
      },
    );
    if (!mine) {
      options.push({ label: 'Report', icon: 'flag-outline', onPress: () => s.report('chat', message.id, message.body ?? 'Photo or video') });
      options.push({ label: `Block ${firstName}`, icon: 'hand-left-outline', danger: true, onPress: () => s.block(message.userId) });
    }
    if (mine || s.isLeader) {
      options.push({ label: 'Delete message', icon: 'trash-outline', danger: true, onPress: () => s.deleteChat(message.id) });
    }
    openSheet({
      header: (
        <View style={styles.emojiRow}>
          {REACTION_EMOJIS.map((emoji) => {
            const on = message.reactions[emoji]?.includes(me.id);
            return (
              <Pressable
                key={emoji}
                onPress={() => { s.toggleReaction('chat', message.id, emoji); closeSheet(); }}
                style={[styles.emojiBtn, on ? { backgroundColor: colors.accentSoft } : null]}
              >
                <Text style={{ fontSize: 24 }}>{emoji}</Text>
              </Pressable>
            );
          })}
        </View>
      ),
      options,
    });
  };

  return (
    <View style={[styles.row, mine ? { justifyContent: 'flex-end' } : null, { marginTop: showAuthor ? 14 : 4 }]}>
      {!mine ? <View style={{ width: 34 }}>{showAuthor ? <Avatar user={user} size={34} /> : null}</View> : null}
      <View style={{ maxWidth: '78%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
        {showAuthor && !mine ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 4 }}>
            <Txt v="smallBold">{user?.name ?? 'Someone'}</Txt>
            {user ? <RoleBadge role={user.role} /> : null}
          </View>
        ) : null}
        <Pressable onPress={menu} onLongPress={menu} style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          {message.forwardedFrom ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 }}>
              <Ionicons name="arrow-redo" size={12} color={mine ? 'rgba(255,255,255,0.8)' : colors.muted} />
              <Txt v="small" color={mine ? 'rgba(255,255,255,0.8)' : colors.muted}>From {message.forwardedFrom}</Txt>
            </View>
          ) : null}
          {message.media ? <MediaTile item={message.media} style={{ width: 220, height: 160, marginBottom: message.body ? 8 : 0 }} big /> : null}
          {message.body ? (
            <Text style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: mine ? colors.white : colors.ink }}>{message.body}</Text>
          ) : null}
          <Text style={[styles.time, { color: mine ? 'rgba(255,255,255,0.7)' : colors.muted }]}>{formatTime(message.createdAt)}</Text>
        </Pressable>
        {reactions.length > 0 ? (
          <View style={{ flexDirection: 'row', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
            {reactions.map(([emoji, ids]) => {
              const on = ids.includes(me.id);
              return (
                <Pressable
                  key={emoji}
                  onPress={() => s.toggleReaction('chat', message.id, emoji)}
                  style={[styles.reaction, on ? { backgroundColor: colors.accentSoft, borderColor: colors.accent } : null]}
                >
                  <Text style={{ fontSize: 12 }}>{emoji}</Text>
                  <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: on ? colors.accent : colors.inkSoft }}>{ids.length}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingBottom: space.md,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  dayPill: { alignSelf: 'center', backgroundColor: colors.line, paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.pill, marginTop: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbleOther: { backgroundColor: colors.surface, borderTopLeftRadius: 6 },
  bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
  time: { fontFamily: fonts.body, fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  reaction: {
    flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, height: 26, borderRadius: 13,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line,
  },
  attach: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  emojiRow: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space.md },
  emojiBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
