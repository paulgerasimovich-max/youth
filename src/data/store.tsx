// Точка входа для экранов: один и тот же набор действий, а за ним — либо настоящая
// база (если заданы настройки Supabase), либо демо-режим на выдуманных данных.

import React from 'react';
import { isLive } from '../lib/supabase';
import { DemoStoreProvider } from './demoStore';
import { LiveStoreProvider } from './liveStore';

export { useStore } from './storeContext';
export { REACTION_EMOJIS } from './storeTypes';
export type { NotifSettings, Store } from './storeTypes';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return isLive ? <LiveStoreProvider>{children}</LiveStoreProvider> : <DemoStoreProvider>{children}</DemoStoreProvider>;
}
