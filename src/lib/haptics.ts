// Короткий виброотклик под пальцем (например, при зажатии сообщения).
// В браузере ничего не делает; на телефоне без вибромотора тихо пропускается.

import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export function tapFeedback(): void {
  if (Platform.OS === 'web') return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
