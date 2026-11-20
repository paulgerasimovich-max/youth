// Общие «кирпичики» интерфейса: текст, кнопки, карточки, аватарки и т.д.
// Весь внешний вид берётся из src/theme.ts.

import React, { useState } from 'react';
import {
  Image, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Switch, Text, TextInput, TextInputProps,
  TextStyle, View, ViewStyle,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { avatarPalette, colors, fonts, radius, space } from '../theme';
import { REACTION_EMOJIS } from '../data/store';
import type { MediaItem, Reactions, Role, User } from '../data/types';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export { Ionicons };

export const shadow: ViewStyle = { boxShadow: '0 6px 18px rgba(32, 21, 46, 0.07)' };

// ---------- Текст ----------
const textVariants = StyleSheet.create({
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: colors.ink, letterSpacing: -0.5 },
  h1: { fontFamily: fonts.display, fontSize: 22, lineHeight: 28, color: colors.ink, letterSpacing: -0.3 },
  h2: { fontFamily: fonts.displayMedium, fontSize: 15, lineHeight: 21, color: colors.ink },
  title: { fontFamily: fonts.bodyBold, fontSize: 16, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: colors.inkSoft },
  bodyBold: { fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 22, color: colors.ink },
  small: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18, color: colors.muted },
  smallBold: { fontFamily: fonts.bodyBold, fontSize: 13, lineHeight: 18, color: colors.ink },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 11, lineHeight: 14, color: colors.muted, letterSpacing: 1.3, textTransform: 'uppercase' },
});

export function Txt({
  v = 'body', color, center, style, ...rest
}: React.ComponentProps<typeof Text> & { v?: keyof typeof textVariants; color?: string; center?: boolean }) {
  return <Text {...rest} style={[textVariants[v], color ? { color } : null, center ? { textAlign: 'center' } : null, style]} />;
}

// ---------- Экран ----------
export function Screen({
  children, scroll = true, padded = true, bg = colors.bg, edgeTop = true, contentStyle,
}: {
  children: React.ReactNode; scroll?: boolean; padded?: boolean; bg?: string; edgeTop?: boolean; contentStyle?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  const pad = padded ? { paddingHorizontal: space.xl } : null;
  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingTop: edgeTop ? insets.top : 0 }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[pad, { paddingBottom: 32 + insets.bottom }, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
      )}
    </View>
  );
}

// Шапка внутренних экранов: кнопка «назад», заголовок, действие справа
export function Header({ title, right, onBack, light }: { title?: string; right?: React.ReactNode; onBack?: () => void; light?: boolean }) {
  const nav = useNavigation();
  return (
    <View style={styles.header}>
      <Pressable
        onPress={onBack ?? (() => nav.goBack())}
        hitSlop={10}
        style={[styles.roundBtn, light ? { backgroundColor: 'rgba(255,255,255,0.18)' } : null]}
        accessibilityLabel="Back"
      >
        <Ionicons name="chevron-back" size={20} color={light ? colors.white : colors.ink} />
      </Pressable>
      <Txt v="h2" numberOfLines={1} color={light ? colors.white : undefined} style={{ flex: 1, textAlign: 'center' }}>
        {title ?? ''}
      </Txt>
      <View style={{ minWidth: 40, alignItems: 'flex-end' }}>{right}</View>
    </View>
  );
}

export function IconButton({ icon, onPress, color = colors.ink, bg = colors.surface, size = 40, label }: {
  icon: IconName; onPress?: () => void; color?: string; bg?: string; size?: number; label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.roundBtn, { width: size, height: size, backgroundColor: bg, opacity: pressed ? 0.7 : 1 }]}
    >
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </Pressable>
  );
}

// ---------- Кнопка ----------
type ButtonVariant = 'primary' | 'dark' | 'soft' | 'outline' | 'danger' | 'white' | 'success' | 'glass';
const buttonColors: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.accent, fg: colors.white },
  dark: { bg: colors.ink, fg: colors.white },
  soft: { bg: colors.accentSoft, fg: colors.accent },
  outline: { bg: 'transparent', fg: colors.ink, border: colors.line },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  white: { bg: colors.white, fg: colors.ink },
  success: { bg: colors.greenSoft, fg: colors.green },
  glass: { bg: 'rgba(255,255,255,0.16)', fg: colors.white },
};

export function Button({
  title, onPress, variant = 'primary', icon, small, disabled, style, full = true,
}: {
  title: string; onPress?: () => void; variant?: ButtonVariant; icon?: IconName; small?: boolean; disabled?: boolean;
  style?: StyleProp<ViewStyle>; full?: boolean;
}) {
  const c = buttonColors[variant];
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small ? styles.buttonSmall : null,
        { backgroundColor: c.bg, borderColor: c.border ?? 'transparent', borderWidth: c.border ? 1.5 : 0 },
        full ? null : { alignSelf: 'flex-start' },
        disabled ? { opacity: 0.4 } : pressed ? { opacity: 0.85, transform: [{ scale: 0.98 }] } : null,
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={small ? 16 : 18} color={c.fg} /> : null}
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: small ? 13 : 15, color: c.fg }}>{title}</Text>
    </Pressable>
  );
}

// ---------- Карточка ----------
export function Card({ children, style, onPress, bg = colors.surface }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; bg?: string;
}) {
  const base = [styles.card, shadow, { backgroundColor: bg }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [...base, pressed ? { opacity: 0.9, transform: [{ scale: 0.99 }] } : null]}>
      {children}
    </Pressable>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <Txt v="h2">{title}</Txt>
      {action ? (
        <Pressable onPress={onAction} hitSlop={10}>
          <Txt v="smallBold" color={colors.accent}>{action}</Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

// ---------- Аватарки ----------
function colorFor(id: string): string {
  let h = 7;
  for (let i = 0; i < id.length; i++) h = ((h ^ id.charCodeAt(i)) * 16777619) >>> 0;
  return avatarPalette[(h >>> 8) % avatarPalette.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function Avatar({ user, size = 40, ring }: { user?: Pick<User, 'id' | 'name'>; size?: number; ring?: string }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, backgroundColor: user ? colorFor(user.id) : colors.plum,
        alignItems: 'center', justifyContent: 'center', borderWidth: ring ? 2 : 0, borderColor: ring,
      }}
    >
      {user ? (
        <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: size * 0.36, color: colors.white }}>{initials(user.name)}</Text>
      ) : (
        <Ionicons name="eye-off" size={size * 0.45} color={colors.white} />
      )}
    </View>
  );
}

export function AvatarStack({ users, max = 5, size = 28, ring = colors.surface }: { users: User[]; max?: number; size?: number; ring?: string }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {shown.map((u, i) => (
        <View key={u.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar user={u} size={size} ring={ring} />
        </View>
      ))}
      {extra > 0 ? (
        <View style={[styles.extra, { marginLeft: -size * 0.3, height: size, minWidth: size, borderRadius: size / 2, borderColor: ring }]}>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: size * 0.36, color: colors.inkSoft }}>+{extra}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  if (role === 'member') return null;
  const admin = role === 'admin';
  return (
    <View style={[styles.badge, { backgroundColor: admin ? colors.sunSoft : colors.plumSoft }]}>
      <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 10, letterSpacing: 0.6, color: admin ? '#8A6300' : colors.plum }}>
        {admin ? 'LEAD PASTOR' : 'LEADER'}
      </Text>
    </View>
  );
}

// ---------- Чипы и переключатели ----------
export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress?: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active ? { backgroundColor: colors.ink, borderColor: colors.ink } : null]}>
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.white : colors.inkSoft} /> : null}
      <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: active ? colors.white : colors.inkSoft }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string; badge?: number }[]; value: T; onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[styles.segment, active ? [styles.segmentActive, shadow] : null]}>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: active ? colors.ink : colors.muted }}>{o.label}</Text>
            {o.badge ? <CountDot count={o.badge} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function CountDot({ count, color = colors.accent }: { count: number; color?: string }) {
  if (!count) return null;
  return (
    <View style={[styles.countDot, { backgroundColor: color }]}>
      <Text style={{ fontFamily: fonts.bodyHeavy, fontSize: 10, color: colors.white }}>{count}</Text>
    </View>
  );
}

// ---------- Поля ввода ----------
const noOutline = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as unknown as TextStyle) : null;

export function Field({ label, hint, style, ...rest }: TextInputProps & { label?: string; hint?: string }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.lg }}>
      {label ? <Txt v="label" style={{ marginBottom: 6 }}>{label}</Txt> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...rest}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
        style={[
          styles.input,
          rest.multiline ? { minHeight: 120, paddingTop: 14, textAlignVertical: 'top' } : null,
          focused ? { borderColor: colors.accent } : null,
          noOutline,
          style,
        ]}
      />
      {hint ? <Txt v="small" style={{ marginTop: 6 }}>{hint}</Txt> : null}
    </View>
  );
}

// Строка ввода сообщения внизу экрана (чат, комментарии, ответы)
// bottomInset={false} — когда под строкой уже есть нижнее меню (оно само держит отступ от края экрана)
export function Composer({ placeholder, onSend, left, bottomInset = true, inputNativeID }: {
  placeholder: string; onSend: (text: string) => void; left?: React.ReactNode; bottomInset?: boolean; inputNativeID?: string;
}) {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };
  return (
    <View style={[styles.composer, { paddingBottom: bottomInset ? Math.max(insets.bottom, 10) : 10 }]}>
      {left}
      <TextInput
        nativeID={inputNativeID}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline
        rows={1}
        onSubmitEditing={send}
        submitBehavior="submit"
        style={[styles.composerInput, noOutline]}
      />
      <Pressable onPress={send} style={[styles.sendBtn, { opacity: text.trim() ? 1 : 0.35 }]} accessibilityLabel="Send">
        <Ionicons name="arrow-up" size={20} color={colors.white} />
      </Pressable>
    </View>
  );
}

// ---------- Реакции ----------
export function ReactionRow({ reactions, myId, onToggle, light }: {
  reactions: Reactions; myId: string; onToggle: (emoji: string) => void; light?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const entries = Object.entries(reactions).filter(([, ids]) => ids.length > 0);
  const chipBg = light ? 'rgba(255,255,255,0.2)' : colors.surfaceAlt;
  const chipBorder = light ? 'transparent' : colors.line;
  const fg = light ? colors.white : colors.inkSoft;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      {entries.map(([emoji, ids]) => {
        const mine = ids.includes(myId);
        return (
          <Pressable
            key={emoji}
            onPress={() => onToggle(emoji)}
            style={[
              styles.reaction,
              { backgroundColor: chipBg, borderColor: chipBorder },
              mine ? (light ? { backgroundColor: colors.white } : { backgroundColor: colors.accentSoft, borderColor: colors.accent }) : null,
            ]}
          >
            <Text style={{ fontSize: 14 }}>{emoji}</Text>
            <Text style={{ fontFamily: fonts.bodyBold, fontSize: 13, color: mine ? (light ? colors.ink : colors.accent) : fg }}>{ids.length}</Text>
          </Pressable>
        );
      })}
      {open ? (
        REACTION_EMOJIS.map((emoji) => (
          <Pressable
            key={`pick-${emoji}`}
            onPress={() => { onToggle(emoji); setOpen(false); }}
            style={[styles.reaction, { backgroundColor: light ? 'rgba(255,255,255,0.32)' : colors.sunSoft, borderColor: 'transparent', paddingHorizontal: 9 }]}
          >
            <Text style={{ fontSize: 16 }}>{emoji}</Text>
          </Pressable>
        ))
      ) : null}
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityLabel="Add reaction"
        style={[styles.reaction, { backgroundColor: chipBg, borderColor: chipBorder, paddingHorizontal: 9 }]}
      >
        <Ionicons name={open ? 'close' : 'happy-outline'} size={17} color={fg} />
      </Pressable>
    </View>
  );
}

// ---------- Фото и видео (в прототипе — цветные плитки) ----------
export function MediaTile({ item, style, round = radius.md, big }: {
  item: MediaItem; style?: StyleProp<ViewStyle>; round?: number; big?: boolean;
}) {
  return (
    <LinearGradient colors={item.tint} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: round, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }, style]}>
      {item.uri && item.kind === 'photo' ? (
        <Image source={{ uri: item.uri }} resizeMode="cover" style={StyleSheet.absoluteFill} />
      ) : item.emoji ? (
        <Text style={{ fontSize: big ? 72 : 30 }}>{item.emoji}</Text>
      ) : (
        <Ionicons name={item.kind === 'video' ? 'play-circle' : 'image'} size={big ? 56 : 30} color="rgba(255,255,255,0.9)" />
      )}
      {item.kind === 'video' ? (
        <View style={styles.videoBadge}>
          <Ionicons name="play" size={10} color={colors.white} />
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10, color: colors.white }}>{item.duration}</Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

// ---------- Строки списков и настроек ----------
export function Row({ icon, iconBg = colors.surfaceAlt, iconColor = colors.ink, title, subtitle, right, onPress, danger, last }: {
  icon?: IconName; iconBg?: string; iconColor?: string; title: string; subtitle?: string; right?: React.ReactNode;
  onPress?: () => void; danger?: boolean; last?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.row, last ? null : styles.rowBorder, pressed ? { opacity: 0.6 } : null]}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: danger ? colors.dangerSoft : iconBg }]}>
          <Ionicons name={icon} size={18} color={danger ? colors.danger : iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Txt v="bodyBold" color={danger ? colors.danger : undefined}>{title}</Txt>
        {subtitle ? <Txt v="small">{subtitle}</Txt> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null)}
    </Pressable>
  );
}

export function ToggleRow({ title, subtitle, value, onChange, last }: {
  title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean;
}) {
  return (
    <View style={[styles.row, last ? null : styles.rowBorder]}>
      <View style={{ flex: 1 }}>
        <Txt v="bodyBold">{title}</Txt>
        {subtitle ? <Txt v="small">{subtitle}</Txt> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.accent, false: colors.line }} thumbColor={colors.white} />
    </View>
  );
}

export function Empty({ emoji, title, text }: { emoji: string; title: string; text?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 }}>
      <Text style={{ fontSize: 40, marginBottom: 10 }}>{emoji}</Text>
      <Txt v="title" center>{title}</Txt>
      {text ? <Txt v="small" center style={{ marginTop: 4 }}>{text}</Txt> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.xl, paddingVertical: space.md, gap: space.md },
  roundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  button: {
    height: 54, borderRadius: radius.pill, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  buttonSmall: { height: 38, paddingHorizontal: 16 },
  card: { borderRadius: radius.lg, padding: space.lg },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.xxl, marginBottom: space.md },
  extra: { backgroundColor: colors.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, borderWidth: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: radius.pill,
    backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line,
  },
  segmented: { flexDirection: 'row', backgroundColor: colors.line, borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  segmentActive: { backgroundColor: colors.surface },
  countDot: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  input: {
    backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.line, paddingHorizontal: 16,
    height: 54, fontFamily: fonts.body, fontSize: 15, color: colors.ink,
  },
  composer: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: space.lg, paddingTop: 10,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line,
  },
  composerInput: {
    flex: 1, minHeight: 42, maxHeight: 120, backgroundColor: colors.bg, borderRadius: 21, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11,
    fontFamily: fonts.body, fontSize: 15, color: colors.ink,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  reaction: {
    flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 10, borderRadius: radius.pill, borderWidth: 1.5,
  },
  videoBadge: {
    position: 'absolute', left: 6, bottom: 6, flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: radius.pill,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
