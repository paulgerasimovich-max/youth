// События: календарь с кнопкой «I'm in» и раздел идей с голосованием.

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, fonts, radius, space } from '../theme';
import { AvatarStack, Button, Card, Empty, IconButton, Ionicons, Screen, Segmented, Txt } from '../components/ui';
import { useOverlay } from '../components/overlay';
import { useStore } from '../data/store';
import { addDays, formatDayLong, formatMonthYear, formatTime, timeAgo, toISODate, todayISO, weekdayShort } from '../lib/dates';
import type { GroupEvent, Idea, User } from '../data/types';
import { DateBlock } from './HomeScreen';

export function EventsScreen() {
  const nav = useNavigation();
  const { isLeader } = useStore();
  const [tab, setTab] = useState<'calendar' | 'ideas'>('calendar');
  return (
    <Screen>
      <View style={styles.top}>
        <Txt v="display" style={{ flex: 1 }}>Events</Txt>
        {isLeader ? <IconButton icon="add" bg={colors.accent} color={colors.white} size={44} onPress={() => nav.navigate('EventForm')} label="New event" /> : null}
      </View>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'calendar', label: 'Calendar' },
          { value: 'ideas', label: 'Ideas' },
        ]}
      />
      {tab === 'calendar' ? <CalendarTab /> : <IdeasTab />}
    </Screen>
  );
}

// ---------- Календарь ----------
function CalendarTab() {
  const s = useStore();
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);
  const today = todayISO();

  const eventDays = new Set(s.db.events.map((e) => toISODate(new Date(e.startsAt))));
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = addDays(first, -first.getDay()); // неделя начинается с воскресенья
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weeks = cells.slice(35).some((d) => d.getMonth() === cursor.getMonth()) ? 6 : 5;

  const sorted = [...s.db.events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const list = selected
    ? sorted.filter((e) => toISODate(new Date(e.startsAt)) === selected)
    : sorted.filter((e) => toISODate(new Date(e.startsAt)) >= today);

  const move = (n: number) => {
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
    setSelected(null);
  };

  return (
    <>
      <Card style={{ marginTop: space.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.md }}>
          <Txt v="h2" style={{ flex: 1 }}>{formatMonthYear(cursor)}</Txt>
          <IconButton icon="chevron-back" bg={colors.bg} size={34} onPress={() => move(-1)} label="Previous month" />
          <View style={{ width: 8 }} />
          <IconButton icon="chevron-forward" bg={colors.bg} size={34} onPress={() => move(1)} label="Next month" />
        </View>
        <View style={{ flexDirection: 'row' }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} style={styles.weekday}>{d}</Text>
          ))}
        </View>
        {Array.from({ length: weeks }, (_, w) => (
          <View key={w} style={{ flexDirection: 'row' }}>
            {cells.slice(w * 7, w * 7 + 7).map((d) => {
              const iso = toISODate(d);
              const inMonth = d.getMonth() === cursor.getMonth();
              const isSelected = iso === selected;
              const isToday = iso === today;
              const has = eventDays.has(iso);
              return (
                <Pressable key={iso} style={styles.cell} onPress={() => setSelected(isSelected ? null : iso)}>
                  <View
                    style={[
                      styles.cellInner,
                      has && !isSelected ? { backgroundColor: colors.accentSoft } : null,
                      isToday && !isSelected ? { borderWidth: 2, borderColor: colors.ink } : null,
                      isSelected ? { backgroundColor: colors.ink } : null,
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: has || isToday ? fonts.bodyHeavy : fonts.bodySemi, fontSize: 14,
                        color: isSelected ? colors.white : !inMonth ? colors.line : has ? colors.accent : colors.ink,
                      }}
                    >
                      {d.getDate()}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>

      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: space.xxl, marginBottom: space.md }}>
        <Txt v="h2" style={{ flex: 1 }}>{selected ? formatDayLong(selected) : "What's coming up"}</Txt>
        {selected ? (
          <Pressable onPress={() => setSelected(null)} hitSlop={10}>
            <Txt v="smallBold" color={colors.accent}>Show all</Txt>
          </Pressable>
        ) : null}
      </View>
      {list.length === 0 ? (
        <Empty emoji="🗓️" title={selected ? 'Nothing on this day' : 'Nothing planned yet'} text="Got an idea? Drop it in Ideas." />
      ) : (
        list.map((e) => <EventCard key={e.id} event={e} />)
      )}
    </>
  );
}

function EventCard({ event }: { event: GroupEvent }) {
  const nav = useNavigation();
  const s = useStore();
  const day = toISODate(new Date(event.startsAt));
  const going = event.going.map((id) => s.userById(id)).filter((u): u is User => !!u);
  const imIn = event.going.includes(s.me!.id);
  return (
    <Card onPress={() => nav.navigate('EventDetail', { eventId: event.id })} style={{ marginBottom: space.md }}>
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

// ---------- Идеи ----------
function IdeasTab() {
  const nav = useNavigation();
  const s = useStore();
  const ideas = [...s.db.ideas]
    .filter((i) => !s.blocked.includes(i.userId))
    .sort((a, b) => b.votes.length - a.votes.length || b.createdAt.localeCompare(a.createdAt));
  return (
    <>
      <Card bg={colors.plumSoft} style={{ marginTop: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <Text style={{ fontSize: 30 }}>💡</Text>
        <View style={{ flex: 1 }}>
          <Txt v="title">What should we do next?</Txt>
          <Txt v="small" color={colors.inkSoft}>Drop an idea. Vote for the ones you like.</Txt>
        </View>
      </Card>
      <Button title="Share an idea" icon="add" onPress={() => nav.navigate('IdeaForm')} style={{ marginTop: space.md, marginBottom: space.lg }} />
      {ideas.map((idea, i) => <IdeaCard key={idea.id} idea={idea} top={i === 0} />)}
    </>
  );
}

function IdeaCard({ idea, top }: { idea: Idea; top: boolean }) {
  const s = useStore();
  const { openSheet } = useOverlay();
  const voted = idea.votes.includes(s.me!.id);
  const mine = idea.userId === s.me!.id;
  const author = s.userById(idea.userId);
  const menu = () =>
    openSheet({
      options: mine
        ? []
        : [
            { label: 'Report', icon: 'flag-outline', onPress: () => s.report('idea', idea.id, `${idea.title}: ${idea.body}`) },
            { label: `Block ${author?.name.split(' ')[0] ?? 'user'}`, icon: 'hand-left-outline', danger: true, onPress: () => s.block(idea.userId) },
          ],
    });
  return (
    <Card style={{ marginBottom: space.md, flexDirection: 'row', gap: space.md }}>
      <Pressable
        onPress={() => s.toggleVote(idea.id)}
        accessibilityLabel={voted ? 'Remove vote' : 'Vote'}
        style={[styles.vote, voted ? { backgroundColor: colors.accent, borderColor: colors.accent } : null]}
      >
        <Ionicons name="caret-up" size={18} color={voted ? colors.white : colors.inkSoft} />
        <Text style={{ fontFamily: fonts.display, fontSize: 15, color: voted ? colors.white : colors.ink }}>{idea.votes.length}</Text>
      </Pressable>
      <View style={{ flex: 1 }}>
        {top ? (
          <View style={styles.topTag}>
            <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 10, letterSpacing: 0.6, color: '#8A6300' }}>TOP PICK</Text>
          </View>
        ) : null}
        <Txt v="title">{idea.title}</Txt>
        {idea.body ? <Txt v="body" style={{ fontSize: 14, lineHeight: 20 }}>{idea.body}</Txt> : null}
        <Txt v="small" style={{ marginTop: 6 }}>{mine ? 'You' : author?.name.split(' ')[0]} · {timeAgo(idea.createdAt)}</Txt>
      </View>
      {!mine ? (
        <Pressable onPress={menu} hitSlop={10} accessibilityLabel="Idea options">
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.muted} />
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', paddingTop: space.lg, paddingBottom: space.lg },
  weekday: { flex: 1, textAlign: 'center', fontFamily: fonts.bodyHeavy, fontSize: 11, color: colors.muted, paddingBottom: 6 },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
  cellInner: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  vote: {
    width: 52, height: 62, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surfaceAlt,
    alignItems: 'center', justifyContent: 'center',
  },
  topTag: { backgroundColor: colors.sunSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start', marginBottom: 4 },
});
