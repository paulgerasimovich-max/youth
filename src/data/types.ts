// Описание всех «сущностей» приложения: кто и что в нём хранится.

export type Role = 'member' | 'leader' | 'admin';

export interface User {
  id: string;
  name: string;
  birthday?: string; // «ММ-ДД» — по желанию, без года
  role: Role;
  pastor?: boolean; // отметка «пастор» поверх роли лидера: только значок, прав не добавляет
  agreed?: boolean; // подтвердил возраст 13+ и принял правила группы
}

// emoji -> список id людей, поставивших реакцию
export type Reactions = Record<string, string[]>;

export interface Sermon {
  id: string;
  title: string;
  preacher: string;
  date: string; // ГГГГ-ММ-ДД (воскресенье)
  paragraphs: string[];
}

// Ежедневное сообщение: отрывок проповеди, который лидер выбрал на конкретный день
export interface DailyPost {
  id: string;
  sermonId: string;
  day: string; // ГГГГ-ММ-ДД
  time: string; // ЧЧ:ММ — когда придёт пуш
  quote: string;
  note?: string; // мысль лидера к отрывку
  authorId: string;
  reactions: Reactions;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  body: string;
  createdAt: string; // ISO
}

export interface GroupEvent {
  id: string;
  title: string;
  description: string;
  place: string;
  startsAt: string; // ISO
  going: string[];
  createdBy: string;
}

export interface Idea {
  id: string;
  userId: string;
  title: string;
  body: string;
  votes: string[];
  createdAt: string;
}

export interface MediaItem {
  id: string;
  kind: 'photo' | 'video';
  tint: [string, string];
  emoji: string;
  duration?: string; // для видео, например «1:24»
  uri?: string; // адрес настоящего фото/видео (в демо-режиме пусто — рисуется цветная плитка)
  path?: string; // где файл лежит в хранилище
  local?: boolean; // только что выбран на телефоне и ещё не загружен
}

export interface Album {
  id: string;
  title: string;
  date: string; // ГГГГ-ММ-ДД
  createdBy: string;
  items: MediaItem[];
}

export interface ChatMessage {
  id: string;
  userId: string;
  body?: string;
  media?: MediaItem;
  forwardedFrom?: string; // имя автора, если сообщение переслано
  reactions: Reactions;
  createdAt: string;
  editedAt?: string; // когда автор поправил текст
  replyTo?: string; // id сообщения, на которое это отвечает
}

// ---------- Анонимные вопросы ----------
// «Сервер» хранит переписку только с отпечатком секретного кода.
// Кто автор — сервер не знает. Сам код лежит только на телефоне автора.

export interface AnonMessage {
  id: string;
  from: 'asker' | string; // 'asker' — автор вопроса, иначе id лидера
  body: string;
  createdAt: string;
}

export interface AnonThread {
  id: string;
  secretHash: string;
  preferredLeaderId?: string; // пожелание «хочу, чтобы ответил…» (видят все лидеры)
  status: 'open' | 'closed';
  createdAt: string;
  lastMessageAt: string;
  messages: AnonMessage[];
}

// Что хранится на телефоне участника
export interface DeviceSecret {
  threadId: string;
  secret: string;
}

export interface BirthdayGreeting {
  id: string;
  toUserId: string;
  fromUserId: string;
  body: string;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  targetType: 'chat' | 'comment' | 'idea';
  targetId: string;
  preview: string;
  createdAt: string;
  resolved: boolean;
}
