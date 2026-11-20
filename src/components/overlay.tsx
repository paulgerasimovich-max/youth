// Всплывающие панели снизу («что сделать с сообщением?», подтверждения)
// и короткие подсказки. Рисуются поверх всего приложения.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, space } from '../theme';
import { useStore } from '../data/store';
import { IconName, Ionicons, Txt } from './ui';

export interface SheetOption {
  label: string;
  icon?: IconName;
  danger?: boolean;
  onPress: () => void;
}

export interface SheetConfig {
  title?: string;
  message?: string;
  header?: React.ReactNode; // произвольное содержимое сверху (например, ряд эмодзи или фото)
  options?: SheetOption[];
  cancelLabel?: string;
}

// Меню прямо у сообщения, как в мессенджерах: ряд эмодзи над ним, действия под ним.
export interface MenuConfig {
  anchor: { x: number; y: number; width: number; height: number }; // где сообщение на экране (координаты окна)
  alignRight?: boolean; // своё сообщение прижато к правому краю
  emojis?: { items: string[]; active: string[]; onPick: (emoji: string) => void };
  options: SheetOption[];
  onClose?: () => void;
}
type PlacedMenu = MenuConfig & { bounds: { width: number; height: number } };

interface Overlay {
  openSheet: (config: SheetConfig) => void;
  closeSheet: () => void;
  openMenu: (config: MenuConfig) => void;
  closeMenu: () => void;
}

const OverlayContext = createContext<Overlay | null>(null);

export function useOverlay(): Overlay {
  const o = useContext(OverlayContext);
  if (!o) throw new Error('OverlayProvider is missing');
  return o;
}

export function OverlayProvider({ children }: { children: React.ReactNode }) {
  const [sheet, setSheet] = useState<SheetConfig | null>(null);
  const insets = useSafeAreaInsets();
  const { toast } = useStore();
  const closeSheet = useCallback(() => setSheet(null), []);

  const [menu, setMenu] = useState<PlacedMenu | null>(null);
  const rootRef = useRef<React.ComponentRef<typeof View>>(null);
  const onMenuClose = useRef<(() => void) | undefined>(undefined);
  // Сообщение измерено в координатах окна, а рисуем мы внутри своей области (в браузере она меньше окна) — пересчитываем.
  const openMenu = useCallback((config: MenuConfig) => {
    rootRef.current?.measureInWindow((ox, oy, width, height) => {
      onMenuClose.current = config.onClose;
      setMenu({ ...config, anchor: { ...config.anchor, x: config.anchor.x - ox, y: config.anchor.y - oy }, bounds: { width, height } });
    });
  }, []);
  const closeMenu = useCallback(() => {
    onMenuClose.current?.();
    onMenuClose.current = undefined;
    setMenu(null);
  }, []);

  const value = useMemo(() => ({ openSheet: setSheet, closeSheet, openMenu, closeMenu }), [closeSheet, openMenu, closeMenu]);

  return (
    <OverlayContext.Provider value={value}>
      {children}
      <View ref={rootRef} collapsable={false} pointerEvents="none" style={StyleSheet.absoluteFill} />
      {menu ? <AnchoredMenu menu={menu} top={insets.top} bottom={insets.bottom} onClose={closeMenu} /> : null}
      {sheet ? (
        <View style={StyleSheet.absoluteFill}>
          <Pressable style={styles.backdrop} onPress={closeSheet} accessibilityLabel="Close" />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.grabber} />
            {sheet.title ? <Txt v="h2" style={{ marginBottom: 4 }}>{sheet.title}</Txt> : null}
            {sheet.message ? <Txt v="body" style={{ marginBottom: space.md }}>{sheet.message}</Txt> : null}
            {sheet.header}
            {sheet.options?.map((o, i) => (
              <Pressable
                key={o.label}
                onPress={() => { closeSheet(); o.onPress(); }}
                style={({ pressed }) => [styles.option, i === 0 && !sheet.header ? null : styles.optionBorder, pressed ? { opacity: 0.6 } : null]}
              >
                {o.icon ? (
                  <View style={[styles.optionIcon, { backgroundColor: o.danger ? colors.dangerSoft : colors.surfaceAlt }]}>
                    <Ionicons name={o.icon} size={18} color={o.danger ? colors.danger : colors.ink} />
                  </View>
                ) : null}
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: o.danger ? colors.danger : colors.ink }}>{o.label}</Text>
              </Pressable>
            ))}
            <Pressable onPress={closeSheet} style={styles.cancel}>
              <Text style={{ fontFamily: fonts.bodyBold, fontSize: 15, color: colors.inkSoft }}>{sheet.cancelLabel ?? 'Cancel'}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      {toast ? (
        <View pointerEvents="none" style={[styles.toastWrap, { bottom: insets.bottom + 96 }]}>
          <View style={styles.toast}>
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 14, color: colors.white, textAlign: 'center' }}>{toast}</Text>
          </View>
        </View>
      ) : null}
    </OverlayContext.Provider>
  );
}

const EDGE = 12; // отступ от краёв экрана
const GAP = 8; // зазор между сообщением и меню
const EMOJI = 44;
const PILL_H = 52;
const MENU_W = 232;
const OPTION_H = 48;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(v, max));
}

function AnchoredMenu({ menu, top, bottom, onClose }: { menu: PlacedMenu; top: number; bottom: number; onClose: () => void }) {
  const [appear] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(appear, { toValue: 1, useNativeDriver: Platform.OS !== 'web', speed: 26, bounciness: 9 }).start();
  }, [appear]);

  const { anchor, bounds, emojis, options } = menu;
  const pillW = emojis ? emojis.items.length * EMOJI + 12 : 0;
  const pillH = emojis ? PILL_H : 0;
  const pillGap = emojis ? GAP : 0;
  const menuH = options.length * OPTION_H + 8;
  const minTop = top + EDGE;
  const maxBottom = bounds.height - Math.max(bottom, EDGE);
  const anchorBottom = anchor.y + anchor.height;

  // Обычно: эмодзи над сообщением, действия под ним. У нижнего края экрана действия не помещаются снизу —
  // тогда они встают над эмодзи. Если сообщение у самого верха — эмодзи уходят под него.
  let pillTop = anchor.y - pillGap - pillH;
  let menuTop = anchorBottom + GAP;
  if (pillTop < minTop) {
    pillTop = anchorBottom + pillGap;
    menuTop = pillTop + pillH + GAP;
  }
  if (menuTop + menuH > maxBottom) {
    const above = Math.min(pillTop, anchor.y) - GAP - menuH;
    menuTop = above >= minTop ? above : maxBottom - menuH;
  }
  pillTop = clamp(pillTop, minTop, maxBottom - pillH);
  menuTop = clamp(menuTop, minTop, maxBottom - menuH);

  const side = (w: number) => clamp(menu.alignRight ? anchor.x + anchor.width - w : anchor.x, EDGE, bounds.width - EDGE - w);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.menuBackdrop} onPress={onClose} accessibilityLabel="Close" />
      {emojis ? (
        <Animated.View
          style={[
            styles.pill,
            { top: pillTop, left: side(pillW), width: pillW, opacity: appear },
            { transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] },
          ]}
        >
          {emojis.items.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => { onClose(); emojis.onPick(emoji); }}
              style={[styles.pillEmoji, emojis.active.includes(emoji) ? { backgroundColor: colors.accentSoft } : null]}
            >
              <Text style={{ fontSize: 24 }}>{emoji}</Text>
            </Pressable>
          ))}
        </Animated.View>
      ) : null}
      <Animated.View
        style={[
          styles.menu,
          { top: menuTop, left: side(MENU_W), opacity: appear },
          { transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] },
        ]}
      >
        {options.map((o, i) => (
          <Pressable
            key={o.label}
            onPress={() => { onClose(); o.onPress(); }}
            style={({ pressed }) => [styles.menuOption, i > 0 ? styles.optionBorder : null, pressed ? { backgroundColor: colors.bg } : null]}
          >
            <Text style={{ fontFamily: fonts.bodySemi, fontSize: 15, color: o.danger ? colors.danger : colors.ink }}>{o.label}</Text>
            {o.icon ? <Ionicons name={o.icon} size={18} color={o.danger ? colors.danger : colors.inkSoft} /> : null}
          </Pressable>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  menuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32, 21, 46, 0.22)' },
  pill: {
    position: 'absolute', height: PILL_H, borderRadius: PILL_H / 2, backgroundColor: colors.surface, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(32, 21, 46, 0.18)',
  },
  pillEmoji: { width: EMOJI, height: EMOJI, borderRadius: EMOJI / 2, alignItems: 'center', justifyContent: 'center' },
  menu: {
    position: 'absolute', width: MENU_W, borderRadius: 18, backgroundColor: colors.surface, paddingVertical: 4, overflow: 'hidden',
    boxShadow: '0 8px 24px rgba(32, 21, 46, 0.18)',
  },
  menuOption: { height: OPTION_H, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(32, 21, 46, 0.45)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl, paddingHorizontal: space.xl, paddingTop: 10,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: space.lg },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: 13 },
  optionBorder: { borderTopWidth: 1, borderTopColor: colors.line },
  optionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancel: { marginTop: space.sm, height: 50, borderRadius: radius.pill, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
  toast: { backgroundColor: colors.ink, paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.lg, maxWidth: 360 },
});
