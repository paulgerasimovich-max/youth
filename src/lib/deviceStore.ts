// Маленькое хранилище на самом телефоне (не в базе).
// На iPhone/Android — защищённое хранилище системы (Keychain / Keystore),
// в браузерном предпросмотре — обычная память браузера.

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = Platform.OS === 'web' ? globalThis.localStorage?.getItem(key) : await SecureStore.getItemAsync(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    const raw = JSON.stringify(value);
    if (Platform.OS === 'web') globalThis.localStorage?.setItem(key, raw);
    else await SecureStore.setItemAsync(key, raw);
  } catch {
    // хранилище недоступно — не страшно, просто не запомним между запусками
  }
}
