// Точка входа для экранов: один и тот же набор действий, а за ним — либо настоящая
// база (если заданы настройки Supabase), либо демо-режим на выдуманных данных.

import React, { useCallback, useState } from 'react';
import { isLive } from '../lib/supabase';
import { DemoStoreProvider } from './demoStore';
import { LiveStoreProvider } from './liveStore';

export { useStore } from './storeContext';
export { REACTION_EMOJIS } from './storeTypes';
export type { NotifSettings, Store } from './storeTypes';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Проверяющий из магазина приложений вошёл своим адресом и кодом — показываем демо-группу (см. lib/review.ts).
  const [review, setReview] = useState(false);
  const enterReview = useCallback(() => setReview(true), []);
  const leaveReview = useCallback(() => setReview(false), []);

  if (!isLive) return <DemoStoreProvider>{children}</DemoStoreProvider>;
  if (review) return <DemoStoreProvider signedIn onExit={leaveReview}>{children}</DemoStoreProvider>;
  return <LiveStoreProvider onReviewAccess={enterReview}>{children}</LiveStoreProvider>;
}
