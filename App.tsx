import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts, Unbounded_500Medium, Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import {
  Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { colors, gradients } from './src/theme';
import { StoreProvider, useStore } from './src/data/store';
import { OverlayProvider } from './src/components/overlay';
import { PhonePreview } from './src/components/PhonePreview';
import { RootNavigator } from './src/navigation/RootNavigator';

const navTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: colors.bg, card: colors.surface, text: colors.ink, primary: colors.accent } };

export default function App() {
  const [fontsLoaded] = useFonts({
    Unbounded_500Medium, Unbounded_700Bold,
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    ...Ionicons.font,
  });
  const { width, height } = useWindowDimensions();
  // В браузере на большом экране показываем приложение в «рамке телефона»
  const framed = Platform.OS === 'web' && width > 520;

  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;

  return (
    <View style={[styles.root, framed ? styles.rootFramed : null]}>
      <View style={framed ? [styles.phone, { height: Math.min(height - 32, 880) }] : styles.fill}>
        <SafeAreaProvider>
          <PhonePreview>
            <StoreProvider>
              <OverlayProvider>
                <Gate />
              </OverlayProvider>
            </StoreProvider>
          </PhonePreview>
          <StatusBar style="dark" />
        </SafeAreaProvider>
      </View>
    </View>
  );
}

// Пока приложение проверяет, вошёл ли человек, и грузит данные — показываем заставку
function Gate() {
  const { ready } = useStore();
  if (!ready) {
    return (
      <LinearGradient colors={gradients.dusk} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.splash}>
        <View style={styles.splashLogo}>
          <Ionicons name="sunny" size={34} color={colors.ink} />
        </View>
        <ActivityIndicator color={colors.white} style={{ marginTop: 28 }} />
      </LinearGradient>
    );
  }
  return (
    <NavigationContainer theme={navTheme}>
      <RootNavigator />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashLogo: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.sun, alignItems: 'center', justifyContent: 'center' },
  root: { flex: 1, backgroundColor: colors.bg },
  rootFramed: { backgroundColor: '#150E20', alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
  phone: { width: 400, borderRadius: 48, overflow: 'hidden', backgroundColor: colors.bg },
});
