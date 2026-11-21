import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, gradients, radius, space } from '../theme';
import { Avatar, Button, Empty, Header, IconButton, IconName, Ionicons, RoleBadge, Txt } from '../components/ui';
import { useOverlay } from '../components/overlay';
import { useStore } from '../data/store';
import { formatDayLong, formatTime, toISODate } from '../lib/dates';
import type { User } from '../data/types';
import type { ScreenProps } from '../navigation/types';

export function EventDetailScreen({ route, navigation }: ScreenProps<'EventDetail'>) {
  const s = useStore();
  const insets = useSafeAreaInsets();
  const { openSheet } = useOverlay();
  const event = s.db.events.find((e) => e.id === route.params.eventId);
  if (!event) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
        <Header />
        <Empty emoji="🤷" title="This event is gone" />
      </View>
    );
  }
  const going = event.going.map((id) => s.userById(id)).filter((u): u is User => !!u);
  const imIn = event.going.includes(s.me!.id);

  const manage = () =>
    openSheet({
      options: [
        { label: 'Edit event', icon: 'create-outline', onPress: () => navigation.navigate('EventForm', { eventId: event.id }) },
        {
          label: 'Delete event', icon: 'trash-outline', danger: true,
          onPress: () => openSheet({
            title: 'Delete this event?',
            message: 'Everyone who said they\'re in will lose it from their calendar.',
            options: [{ label: 'Yes, delete it', icon: 'trash-outline', danger: true, onPress: () => { navigation.goBack(); s.deleteEvent(event.id); } }],
            cancelLabel: 'Keep it',
          }),
        },
      ],
    });

  const facts: { icon: IconName; text: string }[] = [
    { icon: 'calendar', text: formatDayLong(toISODate(new Date(event.startsAt))) },
    { icon: 'time', text: formatTime(event.startsAt) },
    { icon: 'location', text: event.place },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Шапка стоит на месте и закрывает зону камеры: при прокрутке текст под неё не заезжает */}
      <View style={{ backgroundColor: gradients.dusk[0], paddingTop: insets.top }}>
        <Header
          light
          right={s.isLeader ? <IconButton icon="ellipsis-horizontal" bg="rgba(255,255,255,0.18)" color={colors.white} onPress={manage} label="Manage event" /> : undefined}
        />
      </View>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.pullFill, { backgroundColor: gradients.dusk[0] }]} />
        <LinearGradient colors={gradients.dusk} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.top}>
          <View style={{ paddingHorizontal: space.xl, paddingBottom: space.xxl }}>
            <Text style={styles.title}>{event.title}</Text>
            <View style={{ marginTop: space.lg, gap: 8 }}>
              {facts.map((f) => (
                <View key={f.icon} style={styles.fact}>
                  <Ionicons name={f.icon} size={16} color={colors.sun} />
                  <Txt v="bodyBold" color={colors.white} style={{ flex: 1 }}>{f.text}</Txt>
                </View>
              ))}
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: space.xl }}>
          <Txt v="h2" style={{ marginTop: space.xxl, marginBottom: space.sm }}>The plan</Txt>
          <Txt v="body" style={{ fontSize: 16, lineHeight: 24 }}>{event.description}</Txt>

          <Txt v="h2" style={{ marginTop: space.xxl, marginBottom: space.sm }}>Who's going · {going.length}</Txt>
          {going.length === 0 ? (
            <Txt v="small">Nobody yet. Be the first!</Txt>
          ) : (
            going.map((u) => (
              <View key={u.id} style={styles.person}>
                <Avatar user={u} size={38} />
                <Txt v="bodyBold" style={{ flex: 1 }}>{u.id === s.me!.id ? 'You' : u.name}</Txt>
                <RoleBadge role={u.role} pastor={u.pastor} />
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        <Button
          title={imIn ? "You're in · tap to cancel" : "I'm in"}
          icon={imIn ? 'checkmark-circle' : 'hand-right'}
          variant={imIn ? 'success' : 'primary'}
          onPress={() => s.toggleGoing(event.id)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: { borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  pullFill: { position: 'absolute', left: 0, right: 0, top: -600, height: 600 },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: colors.white, letterSpacing: -0.5 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  person: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  bottom: { paddingHorizontal: space.xl, paddingTop: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line },
});
