import React from 'react';
import { Image, ActivityIndicator, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
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
          <KeyboardProvider>
            <PhonePreview>
              <StoreProvider>
                <OverlayProvider>
                  <Gate />
                </OverlayProvider>
              </StoreProvider>
            </PhonePreview>
          </KeyboardProvider>
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
        <Image source={require('./assets/logo.png')} style={styles.splashLogo} />
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
  splashLogo: { width: 84, height: 84 },
  root: { flex: 1, backgroundColor: colors.bg },
  rootFramed: { backgroundColor: '#150E20', alignItems: 'center', justifyContent: 'center' },
  fill: { flex: 1 },
  phone: { width: 400, borderRadius: 48, overflow: 'hidden', backgroundColor: colors.bg },
});
