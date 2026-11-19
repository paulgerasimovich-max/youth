import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, gradients, radius, space } from '../../theme';
import { Button, Ionicons, Txt } from '../../components/ui';
import type { ScreenProps } from '../../navigation/types';

export function WelcomeScreen({ navigation }: ScreenProps<'Welcome'>) {
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={gradients.dusk} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1 }}>
      <View style={[styles.wrap, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.logoRow}>
          <View style={styles.logo}>
            <Ionicons name="sunny" size={22} color={colors.ink} />
          </View>
          <Text style={styles.logoText}>YOUTH GROUP</Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text style={styles.hero}>Your{'\n'}people.{'\n'}One place.</Text>
          <Txt v="body" color="rgba(255,255,255,0.85)" style={{ fontSize: 16, lineHeight: 24, marginTop: space.lg, maxWidth: 300 }}>
            A word for every day, real talk with leaders, events, and all the photos. No messy group chats.
          </Txt>

          <View style={styles.perks}>
            {[
              { icon: 'sunny-outline' as const, text: 'Daily word' },
              { icon: 'eye-off-outline' as const, text: 'Ask anonymously' },
              { icon: 'calendar-outline' as const, text: 'Events' },
            ].map((p) => (
              <View key={p.text} style={styles.perk}>
                <Ionicons name={p.icon} size={15} color={colors.white} />
                <Text style={{ fontFamily: fonts.bodyBold, fontSize: 12, color: colors.white }}>{p.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <Button title="Create account" variant="white" onPress={() => navigation.navigate('SignUp')} />
        <Button
          title="I already have an account"
          variant="glass"
          onPress={() => navigation.navigate('SignIn')}
          style={{ marginTop: space.md }}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, paddingHorizontal: space.xxl },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.sun, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 2, color: colors.white },
  hero: { fontFamily: fonts.display, fontSize: 44, lineHeight: 50, color: colors.white, letterSpacing: -1 },
  perks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: space.xxl },
  perk: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});
