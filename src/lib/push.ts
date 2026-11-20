// Push-уведомления на телефоне: разрешение, «адрес» телефона для отправки, открытие нужного экрана по нажатию.
// В браузере ничего не делает. Адрес телефона уходит только в нашу базу (в таблицу, которую видит лишь сам человек).

import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

export type PushData = { type?: string; id?: string };
export type PushPermission = 'granted' | 'denied' | 'undetermined';

// Пока человек сидит в чате, уведомления о новых сообщениях чата не всплывают поверх — он и так их видит
let chatOpen = false;
export function setChatOpen(open: boolean): void {
  chatOpen = open;
}

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const quiet = chatOpen && notification.request.content.data?.type === 'chat';
      return { shouldShowBanner: !quiet, shouldShowList: !quiet, shouldPlaySound: !quiet, shouldSetBadge: false };
    },
  });
}

export async function pushPermission(): Promise<PushPermission> {
  if (Platform.OS === 'web') return 'undetermined';
  try {
    return (await Notifications.getPermissionsAsync()).status as PushPermission;
  } catch {
    return 'undetermined';
  }
}

// Адрес этого телефона для уведомлений. ask=true — если разрешения ещё нет, телефон спросит человека.
// null — разрешения нет, это симулятор или что-то пошло не так (приложение при этом работает как обычно).
export async function getPushToken(ask: boolean): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    if (Platform.OS === 'android') {
      // eslint-disable-next-line import/namespace -- значение есть в модуле, проверка просто не видит вложенный экспорт
      await Notifications.setNotificationChannelAsync('default', { name: 'Youth Group', importance: Notifications.AndroidImportance.HIGH });
    }
    let status = (await Notifications.getPermissionsAsync()).status;
    if (status !== 'granted' && ask) status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return null;
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

// Человек нажал на уведомление (в том числе когда приложение было закрыто). Возвращает функцию «перестать слушать».
export function onPushOpened(handler: (data: PushData) => void): () => void {
  if (Platform.OS === 'web') return () => {};
  try {
    const last = Notifications.getLastNotificationResponse();
    if (last) {
      handler(last.notification.request.content.data as PushData);
      Notifications.clearLastNotificationResponse();
    }
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handler(response.notification.request.content.data as PushData);
    });
    return () => sub.remove();
  } catch {
    return () => {};
  }
}

export function openPhoneSettings(): void {
  Linking.openSettings().catch(() => {});
}
