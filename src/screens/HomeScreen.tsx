// Главная: слово на сегодня, дни рождения, ближайшее событие, посты недели, свежие фото.

import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, gradients, radius, space } from '../theme';
import {
  Avatar, AvatarStack, Button, Card, IconName, Ionicons, MediaTile, ReactionRow, Screen, SectionTitle, Txt, shadow,
} from '../components/ui';
import { useStore } from '../data/store';
import {
  dayOfMonth, formatDayLong, formatHHMM, formatTime, greetingForNow, isBirthdayToday, monthShort, todayISO, toISODate,
  weekDays, weekdayShort,
} from '../lib/dates';
import type { DailyPost, GroupEvent, User } from '../data/types';

export function HomeScreen() {
  const nav = useNavigation();
  const s = useStore();
  const me = s.me!;
  const today = todayISO();
  const firstName = me.name.split(' ')[0];

  const [openedAt] = useState(() => Date.now());
  const todayPost = s.db.posts.find((p) => p.day === today);
  const week = weekDays();
  const birthdayPeople = s.db.users.filter((u) => isBirthdayToday(u.birthday));
  const greeting = s.db.greetings.find((g) => g.toUserId === me.id && !s.dismissedGreetings.includes(g.id));
  const nextEvent = [...s.db.events]
    .filter((e) => new Date(e.startsAt).getTime() > openedAt - 3 * 3600000)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];
  const album = s.db.albums[0];

  // лента недели сразу прокручена к сегодняшнему дню
  const weekRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const todayIndex = week.indexOf(today);
  useEffect(() => {
    const t = setTimeout(() => weekRef.current?.scrollTo({ x: Math.max(0, todayIndex * 148 - 20), animated: false }), 80);
    return () => clearTimeout(t);
  }, [todayIndex]);

  return (
    <Screen>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Txt v="label">{formatDayLong(today)}</Txt>
          <Txt v="display" style={{ marginTop: 4 }} numberOfLines={1} adjustsFontSizeToFit>{greetingForNow()}, {firstName}</Txt>
        </View>
        <Pressable onPress={() => nav.navigate('Tabs', { screen: 'Profile' })} accessibilityLabel="My profile">
          <Avatar user={me} size={48} />
        </Pressable>
      </View>

      {todayPost ? <TodayWord post={todayPost} /> : <NoWordToday />}

      {s.isLeader ? <LeaderTools /> : null}

      {greeting ? (
        <LinearGradient colors={gradients.night} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.greeting, shadow]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28 }}>🎉</Text>
            <View style={{ flex: 1 }}>
              <Txt v="label" color={colors.sun}>Just for you</Txt>
              <Txt v="title" color={colors.white}>{s.nameOf(greeting.fromUserId).split(' ')[0]} sent you a birthday note</Txt>
            </View>
          </View>
          <Txt v="body" color="rgba(255,255,255,0.9)" style={{ marginTop: space.md }}>{greeting.body}</Txt>
          <Button title="Thanks!" variant="glass" small full={false} onPress={() => s.dismissGreeting(greeting.id)} style={{ marginTop: space.md }} />
        </LinearGradient>
      ) : null}

      {birthdayPeople.length > 0 ? <BirthdayCard people={birthdayPeople} /> : null}

      {nextEvent ? (
        <>
          <SectionTitle title="Coming up" action="All events" onAction={() => nav.navigate('Tabs', { screen: 'Events' })} />
          <NextEvent event={nextEvent} />
        </>
      ) : null}

      <SectionTitle title="This week" />
      <ScrollView
        ref={weekRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -space.xl }}
        contentContainerStyle={{ paddingHorizontal: space.xl, gap: 10 }}
      >
        {week.map((day) => (
          <WeekDayCard key={day} day={day} post={s.db.posts.find((p) => p.day === day)} />
        ))}
      </ScrollView>

      {album ? (
        <>
          <SectionTitle title="Fresh photos" action="All albums" onAction={() => nav.navigate('Albums')} />
          <Card onPress={() => nav.navigate('Album', { albumId: album.id })} style={{ padding: 10 }}>
            <View style={{ flexDirection: 'row', gap: 6, height: 168 }}>
              <MediaTile item={album.items[0]} style={{ flex: 1.4 }} big />
              <View style={{ flex: 1, gap: 6 }}>
                {album.items[1] ? <MediaTile item={album.items[1]} style={{ flex: 1 }} /> : null}
                {album.items[2] ? <MediaTile item={album.items[2]} style={{ flex: 1 }} /> : null}
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ flex: 1 }}>
                <Txt v="title">{album.title}</Txt>
                <Txt v="small">{album.items.length} photos and videos</Txt>
              </View>
              <Ionicons name="arrow-forward" size={20} color={colors.ink} />
            </View>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function TodayWord({ post }: { post: DailyPost }) {
  const nav = useNavigation();
  const s = useStore();
  const sermon = s.db.sermons.find((x) => x.id === post.sermonId);
  const author = s.userById(post.authorId);
  const commentCount = s.db.comments.filter((c) => c.postId === post.id && !s.blocked.includes(c.userId)).length;
  const open = () => nav.navigate('Post', { postId: post.id });

  return (
    <LinearGradient colors={gradients.sunrise} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, shadow]}>
      <Pressable onPress={open}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.heroTag}>
            <Ionicons name="sunny" size={13} color={colors.ink} />
            <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 11, letterSpacing: 1, color: colors.ink }}>TODAY'S WORD</Text>
          </View>
        </View>
        <Text style={styles.heroQuote} numberOfLines={7}>{post.quote}</Text>
        {sermon ? (
          <Txt v="small" color="rgba(255,255,255,0.85)" style={{ marginTop: 8 }}>From Sunday: {sermon.title}</Txt>
        ) : null}
      </Pressable>

      {post.note ? (
        <View style={styles.note}>
          <Avatar user={author} size={30} ring="rgba(255,255,255,0.6)" />
          <View style={{ flex: 1 }}>
            <Txt v="smallBold" color={colors.white}>{author?.name.split(' ')[0]} says</Txt>
            <Txt v="body" color={colors.white} style={{ fontSize: 14, lineHeight: 20 }}>{post.note}</Txt>
          </View>
        </View>
      ) : null}

      <View style={{ marginTop: space.lg }}>
        <ReactionRow light reactions={post.reactions} myId={s.me!.id} onToggle={(e) => s.toggleReaction('post', post.id, e)} />
      </View>
      <Button
        title={commentCount > 0 ? `Talk about it · ${commentCount}` : 'Talk about it'}
        icon="chatbubble-ellipses"
        variant="white"
        onPress={open}
        style={{ marginTop: space.lg, height: 48 }}
      />
    </LinearGradient>
  );
}

function NoWordToday() {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
      <Text style={{ fontSize: 34 }}>🌤️</Text>
      <Txt v="title" style={{ marginTop: 6 }}>No word for today yet</Txt>
      <Txt v="small" center style={{ marginTop: 2 }}>Catch up on this week below.</Txt>
    </Card>
  );
}

function LeaderTools() {
  const nav = useNavigation();
  const tools: { icon: IconName; label: string; bg: string; fg: string; go: () => void }[] = [
    { icon: 'create', label: 'New post', bg: colors.accentSoft, fg: colors.accent, go: () => nav.navigate('Sermons') },
    { icon: 'calendar', label: 'New event', bg: colors.plumSoft, fg: colors.plum, go: () => nav.navigate('EventForm') },
    { icon: 'images', label: 'New album', bg: colors.greenSoft, fg: colors.green, go: () => nav.navigate('AlbumForm') },
    { icon: 'book', label: 'Sermons', bg: colors.sunSoft, fg: '#8A6300', go: () => nav.navigate('Sermons') },
  ];
  return (
    <>
      <SectionTitle title="Leader tools" />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {tools.map((t) => (
          <Pressable key={t.label} onPress={t.go} style={({ pressed }) => [styles.tool, shadow, pressed ? { opacity: 0.8 } : null]}>
            <View style={[styles.toolIcon, { backgroundColor: t.bg }]}>
              <Ionicons name={t.icon} size={19} color={t.fg} />
            </View>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11.5, color: colors.ink }} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

function BirthdayCard({ people }: { people: User[] }) {
  const nav = useNavigation();
  const s = useStore();
  const meId = s.me!.id;
  const others = people.filter((p) => p.id !== meId);
  const names = people.map((p) => (p.id === meId ? 'you' : p.name.split(' ')[0]));
  const line = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return (
    <Card bg={colors.sunSoft} style={{ marginTop: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
      <Text style={{ fontSize: 30 }}>🎂</Text>
      <View style={{ flex: 1 }}>
        <Txt v="label" color="#8A6300">Birthday today</Txt>
        <Txt v="title">{line === 'you' ? "It's your day!" : line.charAt(0).toUpperCase() + line.slice(1)}</Txt>
      </View>
      {s.isLeader && others[0] ? (
        <Button title="Send a note" small variant="dark" full={false} onPress={() => nav.navigate('GreetingForm', { userId: others[0].id })} />
      ) : null}
    </Card>
  );
}

function NextEvent({ event }: { event: GroupEvent }) {
  const nav = useNavigation();
  const s = useStore();
  const day = toISODate(new Date(event.startsAt));
  const going = event.going.map((id) => s.userById(id)).filter((u): u is User => !!u);
  const imIn = event.going.includes(s.me!.id);
  return (
    <Card onPress={() => nav.navigate('EventDetail', { eventId: event.id })}>
      <View style={{ flexDirection: 'row', gap: space.md }}>
        <DateBlock day={day} />
        <View style={{ flex: 1 }}>
          <Txt v="title">{event.title}</Txt>
          <Txt v="small" style={{ marginTop: 2 }}>{weekdayShort(day)} · {formatTime(event.startsAt)}</Txt>
          <Txt v="small" numberOfLines={1}>{event.place}</Txt>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.lg, gap: space.md }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AvatarStack users={going} max={4} />
          <Txt v="smallBold" color={colors.inkSoft}>{going.length} going</Txt>
        </View>
        <Button
          title={imIn ? "You're in" : "I'm in"}
          icon={imIn ? 'checkmark-circle' : undefined}
          variant={imIn ? 'success' : 'primary'}
          small
          full={false}
          onPress={() => s.toggleGoing(event.id)}
        />
      </View>
    </Card>
  );
}

export function DateBlock({ day, size = 56 }: { day: string; size?: number }) {
  return (
    <View style={{ width: size, height: size + 4, borderRadius: radius.md, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 10, letterSpacing: 1, color: colors.sun }}>{monthShort(day).toUpperCase()}</Text>
      <Text style={{ fontFamily: fonts.display, fontSize: size * 0.36, color: colors.white, marginTop: 1 }}>{dayOfMonth(day)}</Text>
    </View>
  );
}

function WeekDayCard({ day, post }: { day: string; post?: DailyPost }) {
  const nav = useNavigation();
  const { isLeader } = useStore();
  const today = todayISO();
  const isToday = day === today;
  const future = day > today;
  const locked = future && !isLeader;

  if (!post) {
    return (
      <Pressable
        disabled={!isLeader}
        onPress={() => nav.navigate('Sermons')}
        style={[styles.dayCard, { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.line, borderStyle: 'dashed' }]}
      >
        <DayLabel day={day} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 }}>
          <Ionicons name={isLeader ? 'add-circle-outline' : 'moon-outline'} size={22} color={colors.muted} />
          <Txt v="small" center>{isLeader ? 'Add a post' : 'Nothing planned'}</Txt>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled={locked}
      onPress={() => nav.navigate('Post', { postId: post.id })}
      style={[styles.dayCard, shadow, isToday ? { backgroundColor: colors.ink } : null, locked ? { backgroundColor: colors.surfaceAlt } : null]}
    >
      <DayLabel day={day} light={isToday} today={isToday} />
      {locked ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 4 }}>
          <Ionicons name="lock-closed" size={20} color={colors.muted} />
          <Txt v="small" center>Drops at{'\n'}{formatHHMM(post.time)}</Txt>
        </View>
      ) : (
        <>
          <View style={{ flex: 1, marginTop: 8 }}>
            <Text numberOfLines={4} style={{ fontFamily: fonts.bodySemi, fontSize: 13, lineHeight: 18, color: isToday ? colors.white : colors.inkSoft }}>
              {post.quote}
            </Text>
          </View>
          {future ? (
            <Txt v="small" color={colors.accent}>Scheduled · {formatHHMM(post.time)}</Txt>
          ) : (
            <Txt v="smallBold" color={isToday ? colors.sun : colors.accent}>Read</Txt>
          )}
        </>
      )}
    </Pressable>
  );
}

function DayLabel({ day, light, today }: { day: string; light?: boolean; today?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 14, color: light ? colors.white : colors.ink }}>{weekdayShort(day)}</Text>
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: light ? 'rgba(255,255,255,0.7)' : colors.muted }}>
        {today ? 'Today' : dayOfMonth(day)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: space.lg, paddingBottom: space.xl },
  hero: { borderRadius: radius.xl, padding: space.xl },
  heroTag: {
    flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.sun, paddingHorizontal: 10, height: 26, borderRadius: radius.pill,
  },
  heroQuote: { fontFamily: fonts.bodyBold, fontSize: 19, lineHeight: 27, color: colors.white, marginTop: space.md },
  note: {
    flexDirection: 'row', gap: 10, marginTop: space.lg, padding: 12, borderRadius: radius.md, backgroundColor: 'rgba(32, 21, 46, 0.18)',
  },
  greeting: { borderRadius: radius.lg, padding: space.lg, marginTop: space.md },
  tool: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: 12, alignItems: 'center', gap: 6 },
  toolIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayCard: { width: 138, height: 158, borderRadius: radius.lg, backgroundColor: colors.surface, padding: 14 },
});
