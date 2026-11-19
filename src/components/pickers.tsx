// Простой выбор дня и времени — «таблетками», без всплывающих календарей.

import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { colors, fonts, radius, space } from '../theme';
import { addDays, dayOfMonth, formatHHMM, toISODate, weekdayShort } from '../lib/dates';
import { Chip, Txt } from './ui';

export function DayPicker({ label, value, onChange, days }: {
  label?: string; value: string; onChange: (iso: string) => void; days?: string[];
}) {
  const list = days ?? Array.from({ length: 45 }, (_, i) => toISODate(addDays(new Date(), i)));
  return (
    <View style={{ marginBottom: space.lg }}>
      {label ? <Txt v="label" style={{ marginBottom: 6 }}>{label}</Txt> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: 8 }}>
        {list.map((iso) => {
          const active = iso === value;
          return (
            <Pressable
              key={iso}
              onPress={() => onChange(iso)}
              style={{
                width: 56, height: 68, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
                backgroundColor: active ? colors.ink : colors.surface, borderWidth: 1.5, borderColor: active ? colors.ink : colors.line,
              }}
            >
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 11, color: active ? colors.sun : colors.muted }}>{weekdayShort(iso).toUpperCase()}</Text>
              <Text style={{ fontFamily: fonts.display, fontSize: 17, color: active ? colors.white : colors.ink, marginTop: 2 }}>{dayOfMonth(iso)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function TimePicker({ label, value, onChange, times }: {
  label?: string; value: string; onChange: (hhmm: string) => void; times: string[];
}) {
  return (
    <View style={{ marginBottom: space.lg }}>
      {label ? <Txt v="label" style={{ marginBottom: 6 }}>{label}</Txt> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -space.xl }} contentContainerStyle={{ paddingHorizontal: space.xl, gap: 8 }}>
        {times.map((t) => (
          <Chip key={t} label={formatHHMM(t)} active={t === value} onPress={() => onChange(t)} />
        ))}
      </ScrollView>
    </View>
  );
}
