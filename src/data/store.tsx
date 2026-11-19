// «Мозг» прототипа: хранит все данные в памяти и умеет их менять.
// Когда подключим настоящую базу (Supabase), экраны останутся теми же —
// поменяется только то, что внутри этого файла.

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { todayISO } from '../lib/dates';
import { buildDemoDb, Db, hashSecret, makeSecret, ME_ID, uid } from './demo';
import type {
  Album, AnonThread, DailyPost, DeviceSecret, GroupEvent, MediaItem, Report, Role, Sermon, User,
} from './types';

export const REACTION_EMOJIS = ['❤️', '🙏', '🔥', '🙌', '😂', '🎉'];

export interface NotifSettings {
  dailyWord: boolean;
  chat: boolean;
  events: boolean;
  birthdays: boolean;
}

interface Store {
  db: Db;
  me: User | null;
  isLeader: boolean;
  isAdmin: boolean;
  userById: (id: string) => User | undefined;
  nameOf: (id: string) => string;

  // вход
  signIn: () => void;
  signUp: (name: string) => void;
  signOut: () => void;
  deleteAccount: () => void;
  updateMe: (patch: Partial<User>) => void;
  setDemoRole: (role: Role) => void;

  // реакции, комментарии, чат
  toggleReaction: (target: 'post' | 'chat', id: string, emoji: string) => void;
  addComment: (postId: string, body: string) => void;
  deleteComment: (id: string) => void;
  sendChat: (msg: { body?: string; media?: MediaItem; forwardedFrom?: string }) => void;
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
  askQuestion: (body: string, preferredLeaderId?: string) => string;
  replyAsAsker: (threadId: string, body: string) => void;
  replyAsLeader: (threadId: string, body: string) => void;
  closeThread: (threadId: string) => void;
  deleteThread: (threadId: string) => void;
  markThreadSeen: (threadId: string) => void;

  // лидерские действия
  addSermon: (s: Omit<Sermon, 'id'>) => string;
  savePost: (p: Omit<DailyPost, 'id' | 'authorId' | 'reactions'>) => void;
  deletePost: (id: string) => void;
  setUserRole: (userId: string, role: Role) => void;
  sendGreeting: (toUserId: string, body: string) => void;
  dismissedGreetings: string[];
  dismissGreeting: (id: string) => void;
  addAlbum: (title: string, items: MediaItem[]) => void;

  // настройки
  notif: NotifSettings;
  setNotif: (patch: Partial<NotifSettings>) => void;

  // всплывающая подсказка внизу экрана
  toast: string | null;
  showToast: (text: string) => void;
}

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('StoreProvider is missing');
  return s;
}

const nowISO = () => new Date().toISOString();

function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function toggleReactionMap(map: Record<string, string[]>, emoji: string, userId: string) {
  const next = { ...map, [emoji]: toggleIn(map[emoji] ?? [], userId) };
  if (next[emoji].length === 0) delete next[emoji];
  return next;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [initial] = useState(buildDemoDb);
  const [db, setDb] = useState<Db>(initial.db);
  const [meId, setMeId] = useState<string | null>(null);
  const [deviceSecrets, setDeviceSecrets] = useState<DeviceSecret[]>(initial.deviceSecrets);
  // сколько сообщений в каждом своём диалоге участник уже видел
  const [seen, setSeen] = useState<Record<string, number>>({ t_mine: 3 });
  const [blocked, setBlocked] = useState<string[]>([]);
  const [dismissedGreetings, setDismissed] = useState<string[]>([]);
  const [notif, setNotifState] = useState<NotifSettings>({ dailyWord: true, chat: true, events: true, birthdays: true });
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2400);
  }, []);

  const store = useMemo<Store>(() => {
    const me = meId ? db.users.find((u) => u.id === meId) ?? null : null;
    const myId = me?.id ?? '';
    const isLeader = me?.role === 'leader' || me?.role === 'admin';
    const isAdmin = me?.role === 'admin';
    const userById = (id: string) => db.users.find((u) => u.id === id);
    const nameOf = (id: string) => userById(id)?.name ?? 'Someone';
    const patch = (fn: (d: Db) => Partial<Db>) => setDb((d) => ({ ...d, ...fn(d) }));

    const hashes = deviceSecrets.map((s) => hashSecret(s.secret));
    const myThreads = db.threads
      .filter((t) => hashes.includes(t.secretHash))
      .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    const unseenReplies = (t: AnonThread) => {
      const fresh = t.messages.slice(seen[t.id] ?? 0);
      return fresh.filter((m) => m.from !== 'asker').length;
    };
    const lastFromAsker = (t: AnonThread) => t.messages[t.messages.length - 1]?.from === 'asker';

    return {
      db, me, isLeader, isAdmin, userById, nameOf,

      signIn: () => setMeId(ME_ID),
      signUp: (name) => {
        patch((d) => ({ users: d.users.map((u) => (u.id === ME_ID ? { ...u, name } : u)) }));
        setMeId(ME_ID);
      },
      signOut: () => setMeId(null),
      deleteAccount: () => setMeId(null),
      updateMe: (p) => patch((d) => ({ users: d.users.map((u) => (u.id === myId ? { ...u, ...p } : u)) })),
      setDemoRole: (role) => patch((d) => ({ users: d.users.map((u) => (u.id === myId ? { ...u, role } : u)) })),

      toggleReaction: (target, id, emoji) => {
        if (target === 'post') {
          patch((d) => ({ posts: d.posts.map((p) => (p.id === id ? { ...p, reactions: toggleReactionMap(p.reactions, emoji, myId) } : p)) }));
        } else {
          patch((d) => ({ chat: d.chat.map((m) => (m.id === id ? { ...m, reactions: toggleReactionMap(m.reactions, emoji, myId) } : m)) }));
        }
      },
      addComment: (postId, body) =>
        patch((d) => ({ comments: [...d.comments, { id: uid('c'), postId, userId: myId, body, createdAt: nowISO() }] })),
      deleteComment: (id) => patch((d) => ({ comments: d.comments.filter((c) => c.id !== id) })),
      sendChat: (msg) =>
        patch((d) => ({ chat: [...d.chat, { id: uid('ch'), userId: myId, reactions: {}, createdAt: nowISO(), ...msg }] })),
      deleteChat: (id) => patch((d) => ({ chat: d.chat.filter((m) => m.id !== id) })),

      blocked,
      report: (targetType, targetId, preview) => {
        patch((d) => ({
          reports: [...d.reports, { id: uid('r'), reporterId: myId, targetType, targetId, preview, createdAt: nowISO(), resolved: false }],
        }));
        showToast('Reported. A leader will take a look.');
      },
      resolveReport: (id, removeContent) =>
        patch((d) => {
          const r = d.reports.find((x) => x.id === id);
          const reports = d.reports.map((x) => (x.id === id ? { ...x, resolved: true } : x));
          if (!r || !removeContent) return { reports };
          if (r.targetType === 'chat') return { reports, chat: d.chat.filter((m) => m.id !== r.targetId) };
          if (r.targetType === 'comment') return { reports, comments: d.comments.filter((c) => c.id !== r.targetId) };
          return { reports, ideas: d.ideas.filter((i) => i.id !== r.targetId) };
        }),
      block: (userId) => {
        setBlocked((b) => (b.includes(userId) ? b : [...b, userId]));
        showToast(`You won't see ${nameOf(userId).split(' ')[0]}'s messages anymore.`);
      },
      unblock: (userId) => setBlocked((b) => b.filter((x) => x !== userId)),

      toggleGoing: (eventId) =>
        patch((d) => ({ events: d.events.map((e) => (e.id === eventId ? { ...e, going: toggleIn(e.going, myId) } : e)) })),
      saveEvent: (e) =>
        patch((d) => {
          if (e.id) return { events: d.events.map((x) => (x.id === e.id ? { ...x, ...e, id: x.id } : x)) };
          return { events: [...d.events, { ...e, id: uid('e'), going: [myId], createdBy: myId }] };
        }),
      deleteEvent: (id) => patch((d) => ({ events: d.events.filter((e) => e.id !== id) })),
      addIdea: (title, body) =>
        patch((d) => ({ ideas: [...d.ideas, { id: uid('i'), userId: myId, title, body, votes: [myId], createdAt: nowISO() }] })),
      toggleVote: (ideaId) =>
        patch((d) => ({ ideas: d.ideas.map((i) => (i.id === ideaId ? { ...i, votes: toggleIn(i.votes, myId) } : i)) })),

      deviceSecrets,
      myThreads,
      unseenReplies,
      totalUnseenReplies: myThreads.reduce((n, t) => n + unseenReplies(t), 0),
      unansweredCount: db.threads.filter((t) => t.status === 'open' && lastFromAsker(t)).length,
      askQuestion: (body, preferredLeaderId) => {
        // Секретный код рождается на телефоне и никуда не отправляется.
        // «На сервер» уходит только его отпечаток — без имени и без аккаунта.
        const secret = makeSecret();
        const id = uid('t');
        const at = nowISO();
        setDeviceSecrets((s) => [...s, { threadId: id, secret }]);
        setSeen((s) => ({ ...s, [id]: 1 }));
        patch((d) => ({
          threads: [
            ...d.threads,
            {
              id, secretHash: hashSecret(secret), preferredLeaderId, status: 'open', createdAt: at, lastMessageAt: at,
              messages: [{ id: uid('am'), from: 'asker', body, createdAt: at }],
            },
          ],
        }));
        return id;
      },
      replyAsAsker: (threadId, body) => {
        const at = nowISO();
        patch((d) => ({
          threads: d.threads.map((t) =>
            t.id === threadId ? { ...t, lastMessageAt: at, messages: [...t.messages, { id: uid('am'), from: 'asker', body, createdAt: at }] } : t,
          ),
        }));
        setSeen((s) => ({ ...s, [threadId]: (db.threads.find((t) => t.id === threadId)?.messages.length ?? 0) + 1 }));
      },
      replyAsLeader: (threadId, body) => {
        const at = nowISO();
        patch((d) => ({
          threads: d.threads.map((t) =>
            t.id === threadId ? { ...t, lastMessageAt: at, messages: [...t.messages, { id: uid('am'), from: myId, body, createdAt: at }] } : t,
          ),
        }));
      },
      closeThread: (threadId) =>
        patch((d) => ({ threads: d.threads.map((t) => (t.id === threadId ? { ...t, status: 'closed' as const } : t)) })),
      deleteThread: (threadId) => {
        patch((d) => ({ threads: d.threads.filter((t) => t.id !== threadId) }));
        setDeviceSecrets((s) => s.filter((x) => x.threadId !== threadId));
      },
      markThreadSeen: (threadId) => {
        const count = db.threads.find((t) => t.id === threadId)?.messages.length ?? 0;
        setSeen((s) => (s[threadId] === count ? s : { ...s, [threadId]: count }));
      },

      addSermon: (s) => {
        const id = uid('s');
        patch((d) => ({ sermons: [{ ...s, id }, ...d.sermons] }));
        return id;
      },
      savePost: (p) =>
        patch((d) => ({
          // на один день — один пост: новый заменяет старый
          posts: [...d.posts.filter((x) => x.day !== p.day), { ...p, id: uid('p'), authorId: myId, reactions: {} }].sort((a, b) =>
            a.day.localeCompare(b.day),
          ),
        })),
      deletePost: (id) => patch((d) => ({ posts: d.posts.filter((p) => p.id !== id) })),
      setUserRole: (userId, role) => patch((d) => ({ users: d.users.map((u) => (u.id === userId ? { ...u, role } : u)) })),
      sendGreeting: (toUserId, body) =>
        patch((d) => ({ greetings: [...d.greetings, { id: uid('g'), toUserId, fromUserId: myId, body, createdAt: nowISO() }] })),
      dismissedGreetings,
      dismissGreeting: (id) => setDismissed((x) => [...x, id]),
      addAlbum: (title, items) =>
        patch((d) => {
          const album: Album = { id: uid('a'), title, date: todayISO(), createdBy: myId, items };
          return { albums: [album, ...d.albums] };
        }),

      notif,
      setNotif: (p) => setNotifState((n) => ({ ...n, ...p })),

      toast,
      showToast,
    };
  }, [db, meId, deviceSecrets, seen, blocked, dismissedGreetings, notif, toast, showToast]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
