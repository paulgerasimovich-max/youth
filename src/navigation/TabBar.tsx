// Нижнее меню из пяти вкладок — в собственном стиле приложения.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarHeightCallbackContext } from '@react-navigation/bottom-tabs';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme';
import { CountDot, IconName, Ionicons } from '../components/ui';
import { useStore } from '../data/store';

const icons: Record<string, { on: IconName; off: IconName; label: string }> = {
  Home: { on: 'sunny', off: 'sunny-outline', label: 'Home' },
  Chat: { on: 'chatbubbles', off: 'chatbubbles-outline', label: 'Chat' },
  Events: { on: 'calendar', off: 'calendar-outline', label: 'Events' },
  Questions: { on: 'help-buoy', off: 'help-buoy-outline', label: 'Ask' },
  Profile: { on: 'person', off: 'person-outline', label: 'Me' },
};

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isLeader, unansweredCount, totalUnseenReplies, db } = useStore();
  const openReports = db.reports.filter((r) => !r.resolved).length;
  const reportHeight = React.useContext(BottomTabBarHeightCallbackContext);

  return (
    <View
      style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}
      onLayout={(e) => reportHeight?.(e.nativeEvent.layout.height)}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const cfg = icons[route.name];
        const badge =
          route.name === 'Questions' ? (isLeader ? unansweredCount : totalUnseenReplies)
          : route.name === 'Profile' && isLeader ? openReports
          : 0;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={cfg.label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.tab}
          >
            <View style={[styles.pill, focused ? { backgroundColor: colors.ink } : null]}>
              <Ionicons name={focused ? cfg.on : cfg.off} size={21} color={focused ? colors.sun : colors.muted} />
              {badge > 0 ? (
                <View style={styles.badge}>
                  <CountDot count={badge} />
                </View>
              ) : null}
            </View>
            <Text style={{ fontFamily: focused ? fonts.bodyHeavy : fonts.bodySemi, fontSize: 11, color: focused ? colors.ink : colors.muted }}>
              {cfg.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', backgroundColor: colors.surface, paddingTop: 10, paddingHorizontal: 8,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, boxShadow: '0 -6px 24px rgba(32, 21, 46, 0.08)',
  },
  tab: { flex: 1, alignItems: 'center', gap: 4 },
  pill: { width: 56, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -4, right: 2 },
});
