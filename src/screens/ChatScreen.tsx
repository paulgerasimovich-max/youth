// Общий чат: сообщения, фото/видео, реакции, переслать, пожаловаться, заблокировать.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, Keyboard, PanResponder, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ScrollViewProps, TextInput } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useTabBarHeight } from '../navigation/tabBarHeight';
import { KeyboardChatScrollView, KeyboardGestureArea, KeyboardStickyView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, radius, space } from '../theme';
import { Avatar, AvatarStack, Composer, Ionicons, MediaTile, RoleBadge, Txt } from '../components/ui';
import { SheetOption, useOverlay } from '../components/overlay';
import { REACTION_EMOJIS, useStore } from '../data/store';
import { formatDayShort, formatTime, toISODate, todayISO } from '../lib/dates';
import { tapFeedback } from '../lib/haptics';
import { frequentEmojis, quickEmojis, rememberEmoji } from '../lib/emojiUsage';
import type { ChatMessage, MediaItem } from '../data/types';

const INPUT_ID = 'chat-input';

export function ChatScreen() {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const { openSheet } = useOverlay();
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const messages = s.db.chat.filter((m) => !s.blocked.includes(m.userId));

  // Текст в поле ввода и правка: «Edit» подставляет старый текст в поле, как в мессенджерах
  const [text, setText] = useState('');
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  // Ответ на конкретное сообщение: свайп по нему (или «Reply» в меню) — над полем ввода появляется, кому отвечаем
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const startEdit = useCallback((m: ChatMessage) => {
    setReplyingTo(null);
    setEditing(m);
    setText(m.body ?? '');
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);
  const stopEdit = () => {
    setEditing(null);
    setText('');
  };
  const startReply = useCallback((m: ChatMessage) => {
    if (m.id.startsWith('tmp-')) return; // ещё не дошло до сервера
    setEditing((e) => {
      if (e) setText('');
      return null;
    });
    setReplyingTo(m);
    setTimeout(() => inputRef.current?.focus(), 60);
  }, []);
  const submit = (value: string) => {
    if (editing) {
      if (value !== editing.body) s.editChat(editing.id, value);
      setEditing(null);
    } else {
      s.sendChat({ body: value, replyTo: replyingTo?.id });
      setReplyingTo(null);
    }
  };

  // Нажали на цитату в ответе — прокручиваем к исходному сообщению и коротко подсвечиваем его
  const [flashId, setFlashId] = useState<string | null>(null);
  const jumpTo = useCallback(
    (id: string) => {
      const index = messages.findIndex((m) => m.id === id);
      if (index < 0) return;
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 });
      setFlashId(id);
      setTimeout(() => setFlashId(null), 900);
    },
    [messages],
  );

  // Держимся у последних сообщений, как в мессенджерах: если человек внизу чата, то новое сообщение, плашка ответа
  // или изменение высоты списка не уводят низ из вида. Если он листает вверх — не дёргаем.
  const atEnd = useRef(true);
  const stickToEnd = (animated: boolean) => {
    if (atEnd.current) listRef.current?.scrollToEnd({ animated });
  };
  useEffect(() => {
    const t = setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 60);
    return () => clearTimeout(t);
  }, [messages.length]);

  // Клавиатура ведёт себя как в мессенджерах: сообщения поднимаются вместе с ней, поле ввода «прилипает» к её
  // верхнему краю, а смахнуть её можно, потянув список вниз. Под чатом стоит панель вкладок — учитываем её высоту.
  const tabBarHeight = useTabBarHeight();
  const renderScroll = useCallback(
    (props: ScrollViewProps) => <KeyboardChatScrollView {...props} offset={tabBarHeight} keyboardDismissMode="interactive" />,
    [tabBarHeight],
  );

  const sendMedia = (media?: MediaItem) => {
    if (!media) return;
    s.sendChat({ media, replyTo: replyingTo?.id });
    setReplyingTo(null);
  };
  const share = async (kind: 'photo' | 'video') => sendMedia((await s.pickMedia(kind))[0]);
  const snap = async () => sendMedia((await s.takePhoto())[0]);
  const attach = () => {
    Keyboard.dismiss();
    openSheet({
      title: 'Share something',
      options: [
        { label: 'Take a photo', icon: 'camera-outline', onPress: snap },
        { label: 'Pick a photo', icon: 'image-outline', onPress: () => share('photo') },
        { label: 'Pick a video', icon: 'videocam-outline', onPress: () => share('video') },
      ],
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View style={{ flex: 1 }}>
          <Txt v="h1">Group chat</Txt>
          <Txt v="small">{s.db.users.length === 1 ? '1 person' : `${s.db.users.length} people`}</Txt>
        </View>
        <AvatarStack users={s.db.users.slice(1, 6)} max={4} size={30} ring={colors.bg} />
      </View>

      <KeyboardGestureArea interpolator="ios" style={{ flex: 1 }} textInputNativeID={INPUT_ID}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderScrollComponent={renderScroll}
        onScroll={({ nativeEvent: e }) => {
          atEnd.current = e.contentSize.height - e.contentOffset.y - e.layoutMeasurement.height < 120;
        }}
        scrollEventThrottle={64}
        onContentSizeChange={() => stickToEnd(false)}
        onLayout={() => stickToEnd(false)}
        onScrollToIndexFailed={({ averageItemLength, index }) => listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: true })}
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
              <Bubble
                message={item}
                showAuthor={newDay || prev?.userId !== item.userId}
                onEdit={startEdit}
                onReply={startReply}
                onJump={jumpTo}
                flash={flashId === item.id}
              />
            </>
          );
        }}
      />

      <KeyboardStickyView offset={{ opened: tabBarHeight }}>
        <Composer
          bottomInset={false}
          inputNativeID={INPUT_ID}
          inputRef={inputRef}
          value={text}
          onChangeText={setText}
          placeholder="Message..."
          onSend={submit}
          sendIcon={editing ? 'checkmark' : 'arrow-up'}
          top={
            editing ? (
              <View style={styles.editBar}>
                <Ionicons name="create-outline" size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Txt v="smallBold" color={colors.accent}>Editing</Txt>
                  <Txt v="small" numberOfLines={1}>{editing.body}</Txt>
                </View>
                <Pressable onPress={stopEdit} hitSlop={10} accessibilityLabel="Cancel editing">
                  <Ionicons name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>
            ) : replyingTo ? (
              <View style={styles.editBar}>
                <Ionicons name="arrow-undo-outline" size={18} color={colors.accent} />
                <View style={{ flex: 1 }}>
                  <Txt v="smallBold" color={colors.accent}>Replying to {s.nameOf(replyingTo.userId).split(' ')[0]}</Txt>
                  <Txt v="small" numberOfLines={1}>{snippet(replyingTo)}</Txt>
                </View>
                <Pressable onPress={() => setReplyingTo(null)} hitSlop={10} accessibilityLabel="Cancel reply">
                  <Ionicons name="close" size={20} color={colors.muted} />
                </Pressable>
              </View>
            ) : null
          }
          left={
            editing ? undefined : (
              <Pressable onPress={attach} style={styles.attach} accessibilityLabel="Add photo or video">
                <Ionicons name="add" size={24} color={colors.ink} />
              </Pressable>
            )
          }
        />
      </KeyboardStickyView>
      </KeyboardGestureArea>
    </View>
  );
}

// Короткая подпись сообщения для цитаты
function snippet(m: ChatMessage): string {
  return m.body ?? (m.media?.kind === 'video' ? 'Video' : 'Photo');
}

const SWIPE_MAX = 72; // насколько сообщение уезжает за пальцем
const SWIPE_TRIGGER = 52; // дальше этого — отпускание означает «ответить»

// Жест «свайп по сообщению»: сообщение едет за пальцем, у порога — короткая вибрация, отпустили за порогом — onTrigger.
function createReplySwipe(dragX: Animated.Value, onTrigger: () => void) {
  const back = () => Animated.spring(dragX, { toValue: 0, useNativeDriver: Platform.OS !== 'web', speed: 22, bounciness: 6 }).start();
  let armed = false; // палец уже за порогом
  return PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderTerminationRequest: () => false,
    onPanResponderMove: (_, g) => {
      const x = Math.max(-SWIPE_MAX, Math.min(SWIPE_MAX, g.dx * 0.6));
      dragX.setValue(x);
      const past = Math.abs(x) >= SWIPE_TRIGGER;
      if (past && !armed) tapFeedback();
      armed = past;
    },
    onPanResponderRelease: () => {
      if (armed) onTrigger();
      armed = false;
      back();
    },
    onPanResponderTerminate: () => {
      armed = false;
      back();
    },
  });
}

function Bubble({ message, showAuthor, onEdit, onReply, onJump, flash }: {
  message: ChatMessage; showAuthor: boolean; flash: boolean;
  onEdit: (m: ChatMessage) => void; onReply: (m: ChatMessage) => void; onJump: (id: string) => void;
}) {
  const nav = useNavigation();
  const s = useStore();
  const { openSheet, openMenu } = useOverlay();
  const me = s.me!;
  const mine = message.userId === me.id;
  const user = s.userById(message.userId);
  const firstName = user?.name.split(' ')[0] ?? 'user';
  const reactions = Object.entries(message.reactions).filter(([, ids]) => ids.length > 0);
  const bubbleRef = useRef<React.ComponentRef<typeof View>>(null);

  // Нажали или зажали сообщение: пузырёк чуть «подпрыгивает» и остаётся приподнятым, пока открыто меню
  const [scale] = useState(() => new Animated.Value(1));
  const pop = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: Platform.OS !== 'web', speed: 28, bounciness: 10 }).start();

  // Свайп по сообщению в любую сторону — ответить на него. Сообщение едет за пальцем, у порога — короткая вибрация.
  const [dragX] = useState(() => new Animated.Value(0));
  const pan = useMemo(() => createReplySwipe(dragX, () => onReply(message)), [dragX, message, onReply]);

  // Подсветка, когда к сообщению прыгнули из цитаты
  useEffect(() => {
    if (!flash) return;
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.06, useNativeDriver: Platform.OS !== 'web', speed: 28, bounciness: 10 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 28, bounciness: 10 }),
    ]).start();
  }, [flash, scale]);

  const quoted = message.replyTo ? s.db.chat.find((m) => m.id === message.replyTo) : undefined;

  const confirmDelete = () =>
    openSheet({
      title: 'Delete this message?',
      message: "It'll be gone for everyone.",
      options: [{ label: 'Delete', icon: 'trash-outline', danger: true, onPress: () => s.deleteChat(message.id) }],
    });

  const options = (): SheetOption[] => {
    const list: SheetOption[] = [];
    const media = message.media;
    const body = message.body;
    list.push({ label: 'Reply', icon: 'arrow-undo-outline', onPress: () => onReply(message) });
    if (body) {
      list.push({
        label: 'Copy', icon: 'copy-outline',
        onPress: () => { Clipboard.setStringAsync(body).then(() => s.showToast('Copied.')).catch(() => {}); },
      });
    }
    if (mine && body && !message.forwardedFrom) list.push({ label: 'Edit', icon: 'create-outline', onPress: () => onEdit(message) });
    if (media?.uri && !media.local) {
      list.push({
        label: media.kind === 'video' ? 'Play video' : 'Open photo',
        icon: media.kind === 'video' ? 'play-outline' : 'expand-outline',
        onPress: () => nav.navigate('MediaView', { kind: media.kind, uri: media.uri!, path: media.path }),
      });
    }
    if (!mine) {
      list.push({ label: 'Report', icon: 'flag-outline', onPress: () => s.report('chat', message.id, message.body ?? 'Photo or video') });
      list.push({ label: `Block ${firstName}`, icon: 'hand-left-outline', danger: true, onPress: () => s.block(message.userId) });
    }
    if (mine || s.isLeader) list.push({ label: 'Delete', icon: 'trash-outline', danger: true, onPress: confirmDelete });
    return list;
  };

  // Меню появляется прямо у сообщения: эмодзи над ним, действия под ним
  const showMenu = () => {
    bubbleRef.current?.measureInWindow((x, y, width, height) => {
      pop(1.05);
      openMenu({
        anchor: { x, y, width, height },
        alignRight: mine,
        emojis: {
          items: quickEmojis(REACTION_EMOJIS), // любимые эмодзи этого человека; остальные — по кнопке «+»
          frequent: frequentEmojis(),
          active: Object.keys(message.reactions).filter((e) => message.reactions[e]?.includes(me.id)),
          onPick: (emoji) => {
            if (!message.reactions[emoji]?.includes(me.id)) rememberEmoji(emoji);
            s.toggleReaction('chat', message.id, emoji);
          },
        },
        options: options(),
        onClose: () => pop(1),
      });
    });
  };
  const menu = (withFeedback: boolean) => {
    if (withFeedback) tapFeedback();
    // Клавиатура открыта — сначала убираем её и ждём, пока сообщения встанут на место, иначе меню окажется не там
    if (Keyboard.isVisible()) {
      Keyboard.dismiss();
      setTimeout(showMenu, 380);
    } else {
      showMenu();
    }
  };

  return (
    <View style={{ marginTop: showAuthor ? 14 : 4, justifyContent: 'center' }} {...pan.panHandlers}>
      <Animated.View
        style={[styles.replyHint, { left: 4, opacity: dragX.interpolate({ inputRange: [0, SWIPE_TRIGGER], outputRange: [0, 1], extrapolate: 'clamp' }) }]}
      >
        <Ionicons name="arrow-undo" size={18} color={colors.accent} />
      </Animated.View>
      <Animated.View
        style={[styles.replyHint, { right: 4, opacity: dragX.interpolate({ inputRange: [-SWIPE_TRIGGER, 0], outputRange: [1, 0], extrapolate: 'clamp' }) }]}
      >
        <Ionicons name="arrow-undo" size={18} color={colors.accent} />
      </Animated.View>
    <Animated.View style={[styles.row, mine ? { justifyContent: 'flex-end' } : null, { transform: [{ translateX: dragX }] }]}>
      {!mine ? <View style={{ width: 34 }}>{showAuthor ? <Avatar user={user} size={34} /> : null}</View> : null}
      <View style={{ maxWidth: '78%', alignItems: mine ? 'flex-end' : 'flex-start' }}>
        {showAuthor && !mine ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, marginLeft: 4 }}>
            <Txt v="smallBold">{user?.name ?? 'Someone'}</Txt>
            {user ? <RoleBadge role={user.role} /> : null}
          </View>
        ) : null}
        <Animated.View style={{ transform: [{ scale }] }}>
          <Pressable
            ref={bubbleRef}
            onPress={() => menu(false)}
            onLongPress={() => menu(true)}
            delayLongPress={260}
            style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}
          >
            {message.replyTo ? (
              <Pressable
                onPress={quoted ? () => onJump(quoted.id) : undefined}
                style={[styles.quote, { borderLeftColor: mine ? colors.white : colors.accent, backgroundColor: mine ? 'rgba(255,255,255,0.18)' : colors.bg }]}
              >
                <Text numberOfLines={1} style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: mine ? colors.white : colors.accent }}>
                  {quoted ? s.nameOf(quoted.userId).split(' ')[0] : 'Earlier message'}
                </Text>
                {quoted ? (
                  <Text numberOfLines={1} style={{ fontFamily: fonts.body, fontSize: 13, color: mine ? 'rgba(255,255,255,0.85)' : colors.inkSoft }}>
                    {snippet(quoted)}
                  </Text>
                ) : null}
              </Pressable>
            ) : null}
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
            <Text style={[styles.time, { color: mine ? 'rgba(255,255,255,0.7)' : colors.muted }]}>
              {message.editedAt ? 'edited · ' : ''}{formatTime(message.createdAt)}
            </Text>
          </Pressable>
        </Animated.View>
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
    </Animated.View>
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
  replyHint: {
    position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center',
  },
  quote: { borderLeftWidth: 3, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, marginBottom: 6, minWidth: 120 },
  editBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: space.lg, paddingVertical: 8,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line,
  },
  attach: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
});
