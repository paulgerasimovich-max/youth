// Только для предпросмотра в браузере на компьютере.
// Браузер не знает, что у телефона сверху вырез камеры, а снизу — полоска
// и скруглённые углы. Здесь мы изображаем их и сообщаем приложению те же
// «безопасные отступы», что и настоящий iPhone, — чтобы в предпросмотре всё
// выглядело так же, как на телефоне. На настоящем устройстве этот файл
// ничего не делает: там отступы приходят от самой системы.

import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

const simulate =
  Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator.maxTouchPoints ?? 0) === 0;

// Отступы как у современных iPhone с Dynamic Island
const PHONE_INSETS = { top: 54, bottom: 34, left: 0, right: 0 };

export function PhonePreview({ children }: { children: React.ReactNode }) {
  if (!simulate) return <>{children}</>;
  return (
    <SafeAreaInsetsContext.Provider value={PHONE_INSETS}>
      {children}
      <View pointerEvents="none" style={styles.island} />
      <View pointerEvents="none" style={styles.homeBar} />
    </SafeAreaInsetsContext.Provider>
  );
}

const styles = StyleSheet.create({
  island: {
    position: 'absolute', top: 11, alignSelf: 'center', width: 122, height: 35, borderRadius: 18, backgroundColor: '#000',
  },
  homeBar: {
    position: 'absolute', bottom: 8, alignSelf: 'center', width: 136, height: 5, borderRadius: 3, backgroundColor: 'rgba(20, 12, 30, 0.55)',
  },
});
