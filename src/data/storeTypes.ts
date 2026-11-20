// Что умеет «мозг» приложения. Экраны знают только этот список и не знают,
// откуда берутся данные: из демо-набора или из настоящей базы.

import type { Db } from './demo';
import type {
  AnonThread, DailyPost, DeviceSecret, GroupEvent, MediaItem, Report, Role, Sermon, User,
} from './types';

export const REACTION_EMOJIS = ['❤️', '🙏', '🔥', '🙌', '😂', '🎉'];

export interface NotifSettings {
  dailyWord: boolean;
  chat: boolean;
  events: boolean;
  birthdays: boolean;
}

export interface Store {
  db: Db;
  me: User | null;
  isLeader: boolean;
  isAdmin: boolean;
  userById: (id: string) => User | undefined;
  nameOf: (id: string) => string;

  // демо-режим (выдуманные данные) или настоящая база
  isDemo: boolean;
  // false, пока приложение проверяет, вошёл ли человек (показываем заставку)
  ready: boolean;

  // вход по одноразовому коду из письма. Возвращают текст ошибки или null, если всё хорошо.
  requestCode: (email: string, name?: string) => Promise<string | null>;
  verifyCode: (email: string, code: string, name?: string) => Promise<string | null>;
  // человек вошёл, но ещё не назвал себя (вход без регистрации)
  needsName: boolean;
  signOut: () => void;
  deleteAccount: () => void;
  updateMe: (patch: Partial<User>) => void;
  setDemoRole: (role: Role) => void;

  // реакции, комментарии, чат
  toggleReaction: (target: 'post' | 'chat', id: string, emoji: string) => void;
  addComment: (postId: string, body: string) => void;
  deleteComment: (id: string) => void;
  sendChat: (msg: { body?: string; media?: MediaItem; forwardedFrom?: string; replyTo?: string }) => void;
  // выбрать фото/видео с телефона (в демо — цветная плитка)
  pickMedia: (kind: 'photo' | 'video', multiple?: boolean) => Promise<MediaItem[]>;
  takePhoto: () => Promise<MediaItem[]>; // снять на камеру прямо сейчас
  editChat: (id: string, body: string) => void; // поправить текст своего сообщения
  deleteChat: (id: string) => void;

  // жалобы и блокировки
  blocked: string[];
  report: (targetType: Report['targetType'], targetId: string, preview: string) => void;
  resolveReport: (id: string, removeContent: boolean) => void;
  block: (userId: string) => void;
  unblock: (userId: string) => void;

  // события и идеи
  toggleGoing: (eventId: string) => void;
  saveEvent: (e: Omit<GroupEvent, 'id' | 'going' | 'createdBy'> & { id?: string }) => void;
  deleteEvent: (id: string) => void;
  addIdea: (title: string, body: string) => void;
  toggleVote: (ideaId: string) => void;

  // анонимные вопросы
  deviceSecrets: DeviceSecret[];
  myThreads: AnonThread[];
  unseenReplies: (thread: AnonThread) => number;
  totalUnseenReplies: number;
  unansweredCount: number;
  askQuestion: (body: string, preferredLeaderId?: string) => Promise<string | null>;
  replyAsAsker: (threadId: string, body: string) => void;
  replyAsLeader: (threadId: string, body: string) => void;
  closeThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  markThreadSeen: (threadId: string) => void;

  // лидерские действия
  addSermon: (s: Omit<Sermon, 'id'>) => Promise<string | null>;
  savePost: (p: Omit<DailyPost, 'id' | 'authorId' | 'reactions'>) => void;
  deletePost: (id: string) => void;
  setUserRole: (userId: string, role: Role) => void;
  sendGreeting: (toUserId: string, body: string) => void;
  dismissedGreetings: string[];
  dismissGreeting: (id: string) => void;
  addAlbum: (title: string, items: MediaItem[]) => void;
  deleteAlbum: (id: string) => void;
  deleteAlbumItem: (albumId: string, itemId: string) => void;

  // настройки
  notif: NotifSettings;
  setNotif: (patch: Partial<NotifSettings>) => void;

  // всплывающая подсказка внизу экрана
  toast: string | null;
  showToast: (text: string) => void;
}
