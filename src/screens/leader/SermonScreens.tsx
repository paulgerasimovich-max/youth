// Лидерам: проповеди, выбор отрывков, создание ежедневных постов и план недели.

import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, space } from '../../theme';
import { Button, Card, Empty, Field, Header, Ionicons, Screen, Txt } from '../../components/ui';
import { DayPicker, TimePicker } from '../../components/pickers';
import { useOverlay } from '../../components/overlay';
import { useStore } from '../../data/store';
import {
  addDays, dayOfMonth, formatDayShort, formatHHMM, startOfWeek, toISODate, todayISO, weekDays, weekdayLong, weekdayShort,
} from '../../lib/dates';
import type { ScreenProps } from '../../navigation/types';

export function SermonsScreen({ navigation }: ScreenProps<'Sermons'>) {
  const s = useStore();
  const { openSheet } = useOverlay();
  const week = weekDays();
  const today = todayISO();

  return (
    <Screen padded={false}>
      <Header title="Sermons and posts" />
      <View style={{ paddingHorizontal: space.xl }}>
        <Txt v="h2" style={{ marginTop: space.sm, marginBottom: space.md }}>This week's plan</Txt>
        <Card style={{ paddingVertical: 4 }}>
          {week.map((day, i) => {
            const post = s.db.posts.find((p) => p.day === day);
            const past = day < today;
            return (
              <Pressable
                key={day}
                disabled={!post}
                onPress={() =>
                  post &&
                  openSheet({
                    title: `${weekdayLong(day)}'s post`,
                    message: post.quote,
                    options: [
                      { label: 'Open post', icon: 'open-outline', onPress: () => navigation.navigate('Post', { postId: post.id }) },
                      { label: 'Remove from plan', icon: 'trash-outline', danger: true, onPress: () => s.deletePost(post.id) },
                    ],
                  })
                }
                style={[styles.planRow, i === week.length - 1 ? null : { borderBottomWidth: 1, borderBottomColor: colors.line }]}
              >
                <View style={[styles.planDay, day === today ? { backgroundColor: colors.ink } : null]}>
                  <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 10, color: day === today ? colors.sun : colors.muted }}>{weekdayShort(day).toUpperCase()}</Text>
                  <Text style={{ fontFamily: fonts.display, fontSize: 14, color: day === today ? colors.white : colors.ink }}>{dayOfMonth(day)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  {post ? (
                    <>
                      <Txt v="bodyBold" numberOfLines={2} style={{ fontSize: 14, lineHeight: 19 }}>{post.quote}</Txt>
                      <Txt v="small" color={past || day === today ? colors.green : colors.accent}>
                        {past || day === today ? 'Sent' : 'Scheduled'} · {formatHHMM(post.time)}
                      </Txt>
                    </>
                  ) : (
                    <Txt v="small">No post yet</Txt>
                  )}
                </View>
                {post ? <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} /> : null}
              </Pressable>
            );
          })}
        </Card>
        <Txt v="small" style={{ marginTop: 8 }}>To add a post, open a sermon and pick the part you want to send.</Txt>

        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.xxl, marginBottom: space.md }}>
          <Txt v="h2" style={{ flex: 1 }}>Sermons</Txt>
        </View>
        {s.db.sermons.map((sermon) => (
          <Card key={sermon.id} onPress={() => navigation.navigate('Sermon', { sermonId: sermon.id })} style={{ marginBottom: space.md, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={styles.sermonIcon}>
              <Ionicons name="book" size={20} color="#8A6300" />
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="title">{sermon.title}</Txt>
              <Txt v="small">{sermon.preacher} · {formatDayShort(sermon.date)} · {sermon.paragraphs.length} parts</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        ))}
        <Button title="Add a sermon" icon="add" variant="dark" onPress={() => navigation.navigate('SermonForm')} style={{ marginTop: space.sm }} />
      </View>
    </Screen>
  );
}

export function SermonFormScreen({ navigation }: ScreenProps<'SermonForm'>) {
  const s = useStore();
  const lastSunday = addDays(startOfWeek(), -1);
  const sundays = Array.from({ length: 6 }, (_, i) => toISODate(addDays(lastSunday, -7 * i)));
  const [title, setTitle] = useState('');
  const [preacher, setPreacher] = useState('');
  const [date, setDate] = useState(sundays[0]);
  const [text, setText] = useState('');
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const save = () => {
    const id = s.addSermon({ title: title.trim(), preacher: preacher.trim() || s.me!.name, date, paragraphs });
    navigation.replace('Sermon', { sermonId: id });
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header title="Add a sermon" />
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
          <Field label="Title" placeholder="Rooted" value={title} onChangeText={setTitle} />
          <Field label="Who preached" placeholder="Name" value={preacher} onChangeText={setPreacher} autoCapitalize="words" />
          <DayPicker label="Which Sunday" value={date} onChange={setDate} days={sundays} />
          <Field
            label="Sermon text"
            placeholder="Paste the sermon here."
            value={text}
            onChangeText={setText}
            multiline
            style={{ minHeight: 220 }}
            hint={paragraphs.length > 0 ? `${paragraphs.length} part${paragraphs.length === 1 ? '' : 's'} found.` : 'Leave an empty line between paragraphs. Each one becomes a part you can pick.'}
          />
          <Button title="Save sermon" onPress={save} disabled={!title.trim() || paragraphs.length === 0} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

export function SermonScreen({ route, navigation }: ScreenProps<'Sermon'>) {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const sermon = s.db.sermons.find((x) => x.id === route.params.sermonId);
  const [picked, setPicked] = useState<number[]>([]);
  if (!sermon) {
    return (
      <Screen padded={false}>
        <Header />
        <Empty emoji="🤷" title="This sermon is gone" />
      </Screen>
    );
  }
  const used = new Set(s.db.posts.filter((p) => p.sermonId === sermon.id).map((p) => p.quote));
  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i].sort((a, b) => a - b)));
  const quote = picked.map((i) => sermon.paragraphs[i]).join('\n\n');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <Header />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space.xl, paddingBottom: 24 }}>
        <Txt v="h1">{sermon.title}</Txt>
        <Txt v="small" style={{ marginTop: 4 }}>{sermon.preacher} · {formatDayShort(sermon.date)}</Txt>
        <View style={styles.tip}>
          <Ionicons name="hand-left" size={16} color={colors.accent} />
          <Txt v="smallBold" color={colors.accent} style={{ flex: 1 }}>Tap the parts you want to send out as a daily post.</Txt>
        </View>
        {sermon.paragraphs.map((p, i) => {
          const on = picked.includes(i);
          return (
            <Pressable key={i} onPress={() => toggle(i)} style={[styles.para, on ? { borderColor: colors.accent, backgroundColor: colors.accentSoft } : null]}>
              <View style={[styles.check, on ? { backgroundColor: colors.accent, borderColor: colors.accent } : null]}>
                {on ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <Txt v="body" color={colors.ink}>{p}</Txt>
                {used.has(p) ? <Txt v="small" color={colors.green} style={{ marginTop: 4 }}>Already used this week</Txt> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Button
          title={picked.length ? `Make a post · ${picked.length} picked` : 'Pick a part first'}
          icon="create"
          disabled={picked.length === 0}
          onPress={() => navigation.navigate('PostForm', { sermonId: sermon.id, quote })}
        />
      </View>
    </View>
  );
}

const POST_TIMES = ['06:30', '07:00', '07:30', '08:00', '12:00', '15:30', '18:00', '20:00'];

export function PostFormScreen({ route, navigation }: ScreenProps<'PostForm'>) {
  const s = useStore();
  const today = todayISO();
  const days = weekDays().filter((d) => d >= today);
  const firstFree = days.find((d) => !s.db.posts.some((p) => p.day === d)) ?? days[0];
  const [quote, setQuote] = useState(route.params.quote);
  const [note, setNote] = useState('');
  const [day, setDay] = useState(route.params.day ?? firstFree);
  const [time, setTime] = useState('07:30');
  const clash = s.db.posts.find((p) => p.day === day);

  const save = () => {
    s.savePost({ sermonId: route.params.sermonId, day, time, quote: quote.trim(), note: note.trim() || undefined });
    s.showToast(`Scheduled for ${weekdayLong(day)}, ${formatHHMM(time)}.`);
    navigation.popTo('Sermons');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header title="New daily post" />
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
          <Field label="The word" value={quote} onChangeText={setQuote} multiline style={{ minHeight: 190 }} hint="You can trim or tweak it." />
          <Field label="Your thought (optional)" placeholder="A question, a challenge, a verse to read." value={note} onChangeText={setNote} multiline style={{ minHeight: 90 }} />
          <DayPicker label="Which day" value={day} onChange={setDay} days={days} />
          <TimePicker label="Notification time" value={time} onChange={setTime} times={POST_TIMES} />
          {clash ? (
            <View style={styles.warn}>
              <Ionicons name="alert-circle" size={18} color="#8A6300" />
              <Txt v="small" color="#8A6300" style={{ flex: 1 }}>{weekdayLong(day)} already has a post. Saving will replace it.</Txt>
            </View>
          ) : null}
          <Button title="Schedule post" icon="notifications" onPress={save} disabled={!quote.trim()} />
          <Txt v="small" center style={{ marginTop: space.md }}>Everyone gets a notification at that time.</Txt>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  planRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 12 },
  planDay: { width: 44, height: 48, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  sermonIcon: { width: 46, height: 46, borderRadius: 16, backgroundColor: colors.sunSoft, alignItems: 'center', justifyContent: 'center' },
  tip: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accentSoft, padding: 12, borderRadius: radius.md,
    marginTop: space.lg, marginBottom: space.md,
  },
  para: {
    flexDirection: 'row', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, marginBottom: 10,
    borderWidth: 2, borderColor: 'transparent',
  },
  check: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  bottom: { paddingHorizontal: space.xl, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.sunSoft, padding: 12, borderRadius: radius.md, marginBottom: space.lg },
});
