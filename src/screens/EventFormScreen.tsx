import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { space } from '../theme';
import { Button, Field, Header, Screen } from '../components/ui';
import { DayPicker, TimePicker } from '../components/pickers';
import { useStore } from '../data/store';
import { addDays, combine, hhmmOf, toISODate } from '../lib/dates';
import type { ScreenProps } from '../navigation/types';

const TIMES = ['09:00', '10:00', '11:00', '12:00', '14:00', '16:00', '17:00', '18:00', '18:30', '19:00', '19:30', '20:00'];

export function EventFormScreen({ route, navigation }: ScreenProps<'EventForm'>) {
  const s = useStore();
  const existing = s.db.events.find((e) => e.id === route.params?.eventId);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [place, setPlace] = useState(existing?.place ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [day, setDay] = useState(existing ? toISODate(new Date(existing.startsAt)) : toISODate(addDays(new Date(), 7)));
  const [time, setTime] = useState(existing ? hhmmOf(existing.startsAt) : '19:00');
  const times = TIMES.includes(time) ? TIMES : [time, ...TIMES];

  const save = () => {
    s.saveEvent({ id: existing?.id, title: title.trim(), place: place.trim() || 'To be announced', description: description.trim(), startsAt: combine(day, time) });
    s.showToast(existing ? 'Event updated.' : 'Event is live!');
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen padded={false}>
        <Header title={existing ? 'Edit event' : 'New event'} />
        <View style={{ paddingHorizontal: space.xl, paddingTop: space.md }}>
          <Field label="What's happening" placeholder="Friday Night Youth" value={title} onChangeText={setTitle} />
          <DayPicker label="Day" value={day} onChange={setDay} />
          <TimePicker label="Time" value={time} onChange={setTime} times={times} />
          <Field label="Where" placeholder="Youth Room" value={place} onChangeText={setPlace} />
          <Field label="Details" placeholder="What to bring, who to ask, anything helpful." value={description} onChangeText={setDescription} multiline />
          <Button title={existing ? 'Save changes' : 'Post event'} onPress={save} disabled={!title.trim()} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
