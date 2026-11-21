// Пост дня: полный текст, мысль лидера, реакции и комментарии.

import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, gradients, radius, space } from '../theme';
import { Avatar, Composer, Empty, Header, Ionicons, ReactionRow, RoleBadge, Txt } from '../components/ui';
import { useOverlay } from '../components/overlay';
import { useStore } from '../data/store';
import { formatDayLong, timeAgo, todayISO } from '../lib/dates';
import type { Comment } from '../data/types';
import type { ScreenProps } from '../navigation/types';

export function PostScreen({ route }: ScreenProps<'Post'>) {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const post = s.db.posts.find((p) => p.id === route.params.postId);
  if (!post) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <Header />
        <Empty emoji="🤷" title="This post is gone" />
      </View>
    );
  }
  const sermon = s.db.sermons.find((x) => x.id === post.sermonId);
  const author = s.userById(post.authorId);
  const comments = s.db.comments.filter((c) => c.postId === post.id && !s.blocked.includes(c.userId));
  const isToday = post.day === todayISO();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Шапка стоит на месте и закрывает зону камеры: при прокрутке текст под неё не заезжает */}
      <View style={{ backgroundColor: gradients.sunrise[0], paddingTop: insets.top }}>
        <Header light title={isToday ? "Today's word" : 'Daily word'} />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.pullFill, { backgroundColor: gradients.sunrise[0] }]} />
        <LinearGradient colors={gradients.sunrise} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.top}>
          <View style={{ paddingHorizontal: space.xl, paddingBottom: space.xxl }}>
            <Txt v="label" color="rgba(255,255,255,0.85)">{formatDayLong(post.day)}</Txt>
            <Text style={styles.quote}>{post.quote}</Text>
            {sermon ? (
              <View style={styles.source}>
                <Ionicons name="book" size={14} color={colors.white} />
                <Txt v="small" color={colors.white} style={{ flex: 1 }}>
                  From "{sermon.title}" by {sermon.preacher}
                </Txt>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: space.xl }}>
          {post.note ? (
            <View style={styles.note}>
              <Avatar user={author} size={40} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Txt v="bodyBold">{author?.name}</Txt>
                  {author ? <RoleBadge role={author.role} pastor={author.pastor} /> : null}
                </View>
                <Txt v="body" style={{ marginTop: 2 }}>{post.note}</Txt>
              </View>
            </View>
          ) : null}

          <View style={{ marginTop: space.lg }}>
            <ReactionRow reactions={post.reactions} myId={s.me!.id} onToggle={(e) => s.toggleReaction('post', post.id, e)} />
          </View>

          <Txt v="h2" style={{ marginTop: space.xxl, marginBottom: space.sm }}>
            {comments.length > 0 ? `Comments · ${comments.length}` : 'Comments'}
          </Txt>
          {comments.length === 0 ? (
            <Empty emoji="💬" title="Be the first to say something" text="What stood out to you?" />
          ) : (
            comments.map((c) => <CommentItem key={c.id} comment={c} />)
          )}
        </View>
      </ScrollView>
      <Composer placeholder="Share a thought..." onSend={(text) => s.addComment(post.id, text)} />
    </KeyboardAvoidingView>
  );
}

function CommentItem({ comment }: { comment: Comment }) {
  const s = useStore();
  const { openSheet } = useOverlay();
  const user = s.userById(comment.userId);
  const mine = comment.userId === s.me!.id;

  const menu = () =>
    openSheet({
      options: [
        ...(mine || s.isLeader
          ? [{ label: 'Delete comment', icon: 'trash-outline' as const, danger: true, onPress: () => s.deleteComment(comment.id) }]
          : []),
        ...(!mine
          ? [
              { label: 'Report', icon: 'flag-outline' as const, onPress: () => s.report('comment', comment.id, comment.body) },
              { label: `Block ${user?.name.split(' ')[0] ?? 'user'}`, icon: 'hand-left-outline' as const, danger: true, onPress: () => s.block(comment.userId) },
            ]
          : []),
      ],
    });

  return (
    <View style={styles.comment}>
      <Avatar user={user} size={36} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Txt v="smallBold">{user?.name ?? 'Someone'}</Txt>
          {user ? <RoleBadge role={user.role} pastor={user.pastor} /> : null}
          <Txt v="small">{timeAgo(comment.createdAt)}</Txt>
        </View>
        <Txt v="body" style={{ marginTop: 2 }}>{comment.body}</Txt>
      </View>
      <Pressable onPress={menu} hitSlop={10} accessibilityLabel="Comment options">
        <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  pullFill: { position: 'absolute', left: 0, right: 0, top: -600, height: 600 },
  quote: { fontFamily: fonts.bodyBold, fontSize: 21, lineHeight: 31, color: colors.white, marginTop: space.md },
  source: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: space.lg, padding: 10, borderRadius: radius.md,
    backgroundColor: 'rgba(32, 21, 46, 0.18)',
  },
  note: {
    flexDirection: 'row', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, marginTop: -space.lg,
    boxShadow: '0 6px 18px rgba(32, 21, 46, 0.07)',
  },
  comment: { flexDirection: 'row', gap: space.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
});
