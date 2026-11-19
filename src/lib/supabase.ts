// Связь с базой Supabase.
// В приложении лежат только ПУБЛИЧНЫЕ адрес и ключ. Сами по себе они ничего не
// открывают: что можно прочитать и изменить, решают правила в базе (RLS).
// Секретный ключ в приложение не попадает никогда.

import 'expo-sqlite/localStorage/install';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

// Нет настроек — приложение работает в демо-режиме на выдуманных данных.
export const isLive = url.length > 0 && key.length > 0;

// Обычное подключение: помнит вход человека между запусками приложения.
export const supabase = createClient(isLive ? url : 'http://localhost', isLive ? key : 'demo', {
  auth: {
    storage: localStorage,
    autoRefreshToken: isLive,
    persistSession: isLive,
    detectSessionInUrl: false,
  },
});

// Отдельное подключение для анонимных вопросов. У него НЕТ входа и никогда не будет:
// сервер не может узнать, чей это телефон. (Сервер к тому же сам отклоняет анонимные
// запросы, если вместе с ними пришёл вход в аккаунт.)
export const anonClient = createClient(isLive ? url : 'http://localhost', isLive ? key : 'demo', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'youth-anonymous-no-session',
  },
});
