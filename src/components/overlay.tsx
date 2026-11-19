// Всплывающие панели снизу («что сделать с сообщением?», подтверждения)
// и короткие подсказки. Рисуются поверх всего приложения.

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

interface Overlay {
  openSheet: (config: SheetConfig) => void;
  closeSheet: () => void;
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
  const value = useMemo(() => ({ openSheet: setSheet, closeSheet }), [closeSheet]);

  return (
    <OverlayContext.Provider value={value}>
      {children}
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

const styles = StyleSheet.create({
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
