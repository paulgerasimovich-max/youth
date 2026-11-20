// Настоящая работа приложения: данные лежат в базе Supabase.
// Этот файл загружает их, держит копию в памяти для экранов и отправляет в базу
// всё, что человек делает. Что кому можно — решает сама база (правила RLS),
// поэтому здесь нет проверок «а можно ли» — только удобство показа.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import { anonClient, supabase } from '../lib/supabase';
import { loadJSON, saveJSON } from '../lib/deviceStore';
import { pickFromLibrary, takePhoto, uploadMedia } from '../lib/media';
import { combine, hhmmOf, toBirthday, todayISO } from '../lib/dates';
import { mediaTints } from '../theme';
import type { Db } from './demo';
import { StoreContext } from './storeContext';
import type { NotifSettings, Store } from './storeTypes';
import type { AnonThread, DeviceSecret, MediaItem, Reactions, Role } from './types';

const EMPTY_DB: Db = {
  users: [], sermons: [], posts: [], comments: [], events: [], ideas: [], albums: [], chat: [], threads: [], greetings: [], reports: [],
};
const DEFAULT_NOTIF: NotifSettings = { dailyWord: true, chat: true, events: true, birthdays: true };
const SECRETS_KEY = 'youth.anon.secrets';
const SEEN_KEY = 'youth.anon.seen';
const NEW_NAME = 'New member'; // имя, которое база ставит, пока человек не назвался
const FAIL = "That didn't go through. Try again.";

type Row = Record<string, any>;
type Result = { data: unknown; error: { message: string } | null };

async function rows(query: PromiseLike<Result>): Promise<Row[]> {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as Row[] | null) ?? [];
}

function tintFor(id: string): [string, string] {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return mediaTints[h % mediaTints.length];
}

function durationLabel(seconds: number | null | undefined): string | undefined {
  if (seconds == null) return undefined;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function groupReactions(list: Row[], idField: string): Record<string, Reactions> {
  const out: Record<string, Reactions> = {};
  for (const r of list) {
    const map = (out[r[idField]] ??= {});
    (map[r.emoji] ??= []).push(r.user_id);
  }
  return out;
}

function toggleIn(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

function toggleReactionMap(map: Reactions, emoji: string, userId: string): Reactions {
  const next = { ...map, [emoji]: toggleIn(map[emoji] ?? [], userId) };
  if (next[emoji].length === 0) delete next[emoji];
  return next;
}

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('rate limit') || m.includes('security purposes') || m.includes('too many')) {
    return 'Too many tries. Wait a minute and try again.';
  }
  if (m.includes('expired') || m.includes('invalid')) return "That code didn't work. Check it or ask for a new one.";
  if (m.includes('network') || m.includes('fetch')) return 'No connection. Check your internet and try again.';
  return 'Something went wrong. Try again.';
}

// ---------- загрузка всего, что видно этому человеку ----------
async function fetchEverything(userId: string, secrets: DeviceSecret[]) {
  const from = (table: string) => supabase.from(table);
  const [
    profiles, myBirthday, birthdaysToday, birthdaysAll, sermons, posts, postReactions, comments, events, rsvps, ideas, votes,
    albums, mediaItems, chatDesc, chatReactions, greetings, blocks, prefs, reports, leaderThreads, leaderMessages,
  ] = await Promise.all([
    rows(from('profiles').select('id, name, role')),
    rows(from('birthdays').select('user_id, month, day')),
    rows(supabase.rpc('birthdays_today')),
    rows(supabase.rpc('birthdays_for_leaders')),
    rows(from('sermons').select('*').order('date', { ascending: false })),
    rows(from('daily_posts').select('*').order('day')),
    rows(from('post_reactions').select('post_id, user_id, emoji')),
    rows(from('comments').select('*').order('created_at')),
    rows(from('events').select('*').order('starts_at')),
    rows(from('event_rsvps').select('event_id, user_id')),
    rows(from('ideas').select('*').order('created_at')),
    rows(from('idea_votes').select('idea_id, user_id')),
    rows(from('albums').select('*').order('date', { ascending: false })),
    rows(from('media_items').select('*').order('position')),
    rows(from('chat_messages').select('*').order('created_at', { ascending: false }).limit(300)),
    rows(from('chat_reactions').select('message_id, user_id, emoji')),
    rows(from('birthday_greetings').select('*').order('created_at')),
    rows(from('blocks').select('blocked_id')),
    rows(from('notification_prefs').select('*').eq('user_id', userId)),
    rows(from('reports').select('*').order('created_at', { ascending: false })), // участнику база вернёт пусто
    rows(from('anon_threads').select('*')), // видят только лидеры
    rows(from('anon_messages').select('*').order('created_at')),
  ]);

  // Свои анонимные вопросы — отдельным подключением БЕЗ входа, по секретным кодам с телефона
  let myThreads: Row[] = [];
  let myThreadsLoaded = false;
  if (secrets.length > 0) {
    const { data, error } = await anonClient.rpc('anon_my_threads', { p_secrets: secrets.map((s) => s.secret) });
    if (!error) {
      myThreads = (data as Row[] | null) ?? [];
      myThreadsLoaded = true;
    }
  }

  // Временные ссылки на фото и видео (хранилище закрытое, ссылка живёт час)
  const paths = [...mediaItems.map((m) => m.storage_path), ...chatDesc.map((m) => m.media_path)].filter(Boolean) as string[];
  const urls: Record<string, string> = {};
  if (paths.length > 0) {
    const { data } = await supabase.storage.from('media').createSignedUrls([...new Set(paths)], 3600);
    for (const s of data ?? []) if (s.path && s.signedUrl) urls[s.path] = s.signedUrl;
  }
  const media = (id: string, kind: 'photo' | 'video', path: string, seconds?: number | null): MediaItem => ({
    id, kind, tint: tintFor(id), emoji: '', duration: durationLabel(seconds), path, uri: urls[path],
  });

  const birthdayOf: Record<string, string> = {};
  const pad = (n: number) => String(n).padStart(2, '0');
  for (const b of birthdaysToday) birthdayOf[b.user_id] = toBirthday(new Date());
  for (const b of birthdaysAll) birthdayOf[b.user_id] = `${pad(b.month)}-${pad(b.day)}`;
  for (const b of myBirthday) birthdayOf[b.user_id] = `${pad(b.month)}-${pad(b.day)}`;

  const postR = groupReactions(postReactions, 'post_id');
  const chatR = groupReactions(chatReactions, 'message_id');

  const threads = new Map<string, AnonThread>();
  for (const t of leaderThreads) {
    threads.set(t.id, {
      id: t.id, secretHash: '', preferredLeaderId: t.preferred_leader_id ?? undefined, status: t.status,
      createdAt: t.created_at, lastMessageAt: t.last_message_at,
      messages: leaderMessages
        .filter((m) => m.thread_id === t.id)
        .map((m) => ({ id: m.id, from: m.sender === 'asker' ? 'asker' : m.leader_id ?? 'former-leader', body: m.body, createdAt: m.created_at })),
    });
  }
  for (const t of myThreads) {
    threads.set(t.id, {
      id: t.id, secretHash: '', preferredLeaderId: t.preferred_leader_id ?? undefined, status: t.status,
      createdAt: t.created_at, lastMessageAt: t.last_message_at,
      messages: (t.messages as Row[]).map((m) => ({
        id: m.id, from: m.sender === 'asker' ? 'asker' : m.leader_id ?? 'former-leader', body: m.body, createdAt: m.created_at,
      })),
    });
  }

  const db: Db = {
    users: profiles.map((p) => ({ id: p.id, name: p.name, role: p.role as Role, birthday: birthdayOf[p.id] })),
    sermons: sermons.map((s) => ({ id: s.id, title: s.title, preacher: s.preacher, date: s.date, paragraphs: s.paragraphs })),
    posts: posts.map((p) => ({
      id: p.id, sermonId: p.sermon_id ?? '', day: p.day, time: hhmmOf(p.publish_at), quote: p.quote, note: p.note ?? undefined,
      authorId: p.author_id ?? '', reactions: postR[p.id] ?? {},
    })),
    comments: comments.map((c) => ({ id: c.id, postId: c.post_id, userId: c.user_id, body: c.body, createdAt: c.created_at })),
    events: events.map((e) => ({
      id: e.id, title: e.title, description: e.description, place: e.place, startsAt: e.starts_at,
      going: rsvps.filter((r) => r.event_id === e.id).map((r) => r.user_id), createdBy: e.created_by ?? '',
    })),
    ideas: ideas.map((i) => ({
      id: i.id, userId: i.user_id, title: i.title, body: i.body, createdAt: i.created_at,
      votes: votes.filter((v) => v.idea_id === i.id).map((v) => v.user_id),
    })),
    albums: albums.map((a) => ({
      id: a.id, title: a.title, date: a.date, createdBy: a.created_by ?? '',
      items: mediaItems.filter((m) => m.album_id === a.id).map((m) => media(m.id, m.kind, m.storage_path, m.duration_seconds)),
    })),
    chat: [...chatDesc].reverse().map((m) => ({
      id: m.id, userId: m.user_id, body: m.body ?? undefined,
      media: m.media_path ? media(m.id, m.media_kind, m.media_path) : undefined,
      forwardedFrom: m.forwarded_from ?? undefined, reactions: chatR[m.id] ?? {}, createdAt: m.created_at,
      editedAt: m.edited_at ?? undefined,
    })),
    threads: [...threads.values()],
    greetings: greetings.map((g) => ({ id: g.id, toUserId: g.to_user_id, fromUserId: g.from_user_id ?? '', body: g.body, createdAt: g.created_at })),
    reports: reports.map((r) => ({
      id: r.id, reporterId: r.reporter_id ?? '', targetType: r.target_type, targetId: r.target_id, preview: r.preview,
      createdAt: r.created_at, resolved: !!r.resolved_at,
    })),
  };

  const p = prefs[0];
  return {
    db,
    blocked: blocks.map((b) => b.blocked_id as string),
    notif: p ? { dailyWord: p.daily_word, chat: p.chat, events: p.events, birthdays: p.birthdays } : DEFAULT_NOTIF,
    dismissedGreetings: greetings.filter((g) => g.seen_at).map((g) => g.id as string),
    // id своих переписок, которые ещё существуют (для уборки устаревших секретов)
    liveThreadIds: myThreadsLoaded ? new Set(myThreads.map((t) => t.id as string)) : null,
  };
}

export function LiveStoreProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [db, setDb] = useState<Db>(EMPTY_DB);
  const [deviceSecrets, setDeviceSecrets] = useState<DeviceSecret[]>([]);
  const [seen, setSeen] = useState<Record<string, number>>({});
  const [deviceLoaded, setDeviceLoaded] = useState(false);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [dismissedGreetings, setDismissed] = useState<string[]>([]);
  const [notif, setNotifState] = useState<NotifSettings>(DEFAULT_NOTIF);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userRef = useRef<string | null>(null);
  const secretsRef = useRef<DeviceSecret[]>([]);
  const loadSeq = useRef(0);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const saveSecrets = useCallback((next: DeviceSecret[]) => {
    secretsRef.current = next;
    setDeviceSecrets(next);
    saveJSON(SECRETS_KEY, next);
  }, []);

  // ---------- загрузка ----------
  const reload = useCallback(async () => {
    const uid = userRef.current;
    if (!uid) return;
    const seq = ++loadSeq.current;
    try {
      const fresh = await fetchEverything(uid, secretsRef.current);
      if (seq !== loadSeq.current || userRef.current !== uid) return; // пришёл устаревший ответ
      if (!fresh.db.users.some((u) => u.id === uid)) {
        // аккаунта больше нет (удалён) — выходим
        await supabase.auth.signOut({ scope: 'local' });
        return;
      }
      setDb(fresh.db);
      setBlocked(fresh.blocked);
      setNotifState(fresh.notif);
      setDismissed(fresh.dismissedGreetings);
      if (fresh.liveThreadIds) {
        const alive = secretsRef.current.filter((s) => fresh.liveThreadIds!.has(s.threadId));
        if (alive.length !== secretsRef.current.length) saveSecrets(alive);
      }
      setLoadedFor(uid);
    } catch (e) {
      console.warn('Load failed', e);
      if (seq === loadSeq.current) {
        setLoadedFor(uid); // показываем то, что есть, а не вечную заставку
        showToast("Couldn't load the latest. Check your connection.");
      }
    }
  }, [saveSecrets, showToast]);

  const reloadSoon = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current);
    reloadTimer.current = setTimeout(() => reload(), 250);
  }, [reload]);

  // то, что хранится только на телефоне: секретные коды вопросов и «что уже прочитано»
  useEffect(() => {
    let alive = true;
    Promise.all([loadJSON<DeviceSecret[]>(SECRETS_KEY, []), loadJSON<Record<string, number>>(SEEN_KEY, {})]).then(([s, n]) => {
      if (!alive) return;
      secretsRef.current = s;
      setDeviceSecrets(s);
      setSeen(n);
      setDeviceLoaded(true);
    });
    return () => { alive = false; };
  }, []);

  // вход / выход
  useEffect(() => {
    const apply = (id: string | null) => {
      userRef.current = id;
      setUserId(id);
      setSessionChecked(true);
      if (!id) {
        loadSeq.current++;
        setDb(EMPTY_DB);
        setLoadedFor(null);
        setBlocked([]);
        setDismissed([]);
      }
    };
    supabase.auth.getSession().then(({ data }) => apply(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  // после входа: первая загрузка, «живые» обновления, обновление при возврате в приложение
  useEffect(() => {
    if (!userId || !deviceLoaded) return;
    reload();
    const channel = supabase
      .channel('group-live')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => reloadSoon())
      .subscribe();
    const appState = AppState.addEventListener('change', (state) => { if (state === 'active') reload(); });
    const timer = setInterval(() => reload(), 45000);
    return () => {
      supabase.removeChannel(channel);
      appState.remove();
      clearInterval(timer);
    };
  }, [userId, deviceLoaded, reload, reloadSoon]);

  const store = useMemo<Store>(() => {
    const me = userId ? db.users.find((u) => u.id === userId) ?? null : null;
    const myId = userId ?? '';
    const isLeader = me?.role === 'leader' || me?.role === 'admin';
    const isAdmin = me?.role === 'admin';
    const userById = (id: string) => db.users.find((u) => u.id === id);
    const nameOf = (id: string) => userById(id)?.name ?? 'Someone';
    const patch = (fn: (d: Db) => Partial<Db>) => setDb((d) => ({ ...d, ...fn(d) }));

    // выполнить действие в базе; при ошибке сказать человеку и вернуть настоящее состояние
    const act = async (op: () => PromiseLike<Result>, failText = FAIL): Promise<boolean> => {
      let ok = true;
      try {
        const { error } = await op();
        if (error) throw new Error(error.message);
      } catch (e) {
        console.warn('Action failed', e);
        showToast(failText);
        ok = false;
      }
      reload();
      return ok;
    };

    const mineIds = new Set(deviceSecrets.map((s) => s.threadId));
    const myThreads = db.threads.filter((t) => mineIds.has(t.id)).sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
    const unseenReplies = (t: AnonThread) => t.messages.slice(seen[t.id] ?? 0).filter((m) => m.from !== 'asker').length;
    const lastFromAsker = (t: AnonThread) => t.messages[t.messages.length - 1]?.from === 'asker';
    const secretFor = (threadId: string) => deviceSecrets.find((s) => s.threadId === threadId)?.secret;
    const saveSeen = (next: Record<string, number>) => { setSeen(next); saveJSON(SEEN_KEY, next); };

    const uploadAndSend = async (msg: { body?: string; media?: MediaItem; forwardedFrom?: string }) => {
      let path = msg.media?.path;
      if (msg.media?.local) {
        const uploaded = await uploadMedia(msg.media, `chat/${myId}`);
        if (!uploaded) { showToast("Couldn't upload that. Try again."); reload(); return; }
        path = uploaded;
      }
      await act(() =>
        supabase.from('chat_messages').insert({
          body: msg.body ?? null, media_kind: path ? msg.media!.kind : null, media_path: path ?? null, forwarded_from: msg.forwardedFrom ?? null,
        }),
      );
    };

    return {
      db, me, isLeader, isAdmin, userById, nameOf,
      isDemo: false,
      ready: deviceLoaded && sessionChecked && (userId === null || loadedFor === userId),
      needsName: !!me && me.name === NEW_NAME,

      requestCode: async (email, name) => {
        const { error } = await supabase.auth.signInWithOtp({
          email, options: { shouldCreateUser: true, data: name ? { name } : undefined },
        });
        return error ? friendlyAuthError(error.message) : null;
      },
      verifyCode: async (email, code, name) => {
        const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
        if (error || !data.user) return friendlyAuthError(error?.message ?? 'invalid');
        if (name) {
          // если база создала профиль без имени — дописываем
          await supabase.from('profiles').update({ name }).eq('id', data.user.id).eq('name', NEW_NAME);
        }
        return null;
      },
      signOut: () => { supabase.auth.signOut({ scope: 'local' }); },
      deleteAccount: () => {
        (async () => {
          const { error } = await supabase.rpc('delete_my_account');
          if (error) { showToast(FAIL); return; }
          await supabase.auth.signOut({ scope: 'local' });
        })();
      },
      updateMe: (p) => {
        if (p.name !== undefined) patch((d) => ({ users: d.users.map((u) => (u.id === myId ? { ...u, name: p.name! } : u)) }));
        (async () => {
          if (p.name !== undefined) await act(() => supabase.from('profiles').update({ name: p.name }).eq('id', myId));
          if ('birthday' in p) {
            await supabase.from('birthdays').delete().eq('user_id', myId);
            if (p.birthday) {
              const [month, day] = p.birthday.split('-').map(Number);
              await act(() => supabase.from('birthdays').insert({ month, day }));
            } else reload();
          }
        })();
      },
      setDemoRole: () => {},

      toggleReaction: (target, id, emoji) => {
        const table = target === 'post' ? 'post_reactions' : 'chat_reactions';
        const idField = target === 'post' ? 'post_id' : 'message_id';
        const current = (target === 'post' ? db.posts.find((p) => p.id === id)?.reactions : db.chat.find((m) => m.id === id)?.reactions) ?? {};
        const had = current[emoji]?.includes(myId);
        if (target === 'post') {
          patch((d) => ({ posts: d.posts.map((p) => (p.id === id ? { ...p, reactions: toggleReactionMap(p.reactions, emoji, myId) } : p)) }));
        } else {
          patch((d) => ({ chat: d.chat.map((m) => (m.id === id ? { ...m, reactions: toggleReactionMap(m.reactions, emoji, myId) } : m)) }));
        }
        act(() =>
          had
            ? supabase.from(table).delete().eq(idField, id).eq('user_id', myId).eq('emoji', emoji)
            : supabase.from(table).insert({ [idField]: id, emoji }),
        );
      },
      addComment: (postId, body) => {
        patch((d) => ({ comments: [...d.comments, { id: `tmp-${Date.now()}`, postId, userId: myId, body, createdAt: new Date().toISOString() }] }));
        act(() => supabase.from('comments').insert({ post_id: postId, body }));
      },
      deleteComment: (id) => {
        patch((d) => ({ comments: d.comments.filter((c) => c.id !== id) }));
        act(() => supabase.from('comments').delete().eq('id', id));
      },
      sendChat: (msg) => {
        patch((d) => ({
          chat: [...d.chat, { id: `tmp-${Date.now()}`, userId: myId, reactions: {}, createdAt: new Date().toISOString(), ...msg }],
        }));
        uploadAndSend(msg);
      },
      pickMedia: (kind, multiple) => pickFromLibrary(kind, !!multiple),
      takePhoto: async () => {
        const shot = await takePhoto();
        if (shot === null) showToast('Turn on camera access in Settings to take photos.');
        return shot ?? [];
      },
      editChat: (id, body) => {
        const text = body.trim();
        if (!text) return;
        patch((d) => ({ chat: d.chat.map((m) => (m.id === id ? { ...m, body: text, editedAt: new Date().toISOString() } : m)) }));
        act(() => supabase.from('chat_messages').update({ body: text }).eq('id', id));
      },
      deleteChat: (id) => {
        // Файл убираем из хранилища, только если он загружен в чат и больше ни одно сообщение на него не ссылается
        // (пересланное сообщение и фото из альбома используют тот же файл).
        const path = db.chat.find((m) => m.id === id)?.media?.path;
        const orphan = !!path && path.startsWith('chat/') && !db.chat.some((m) => m.id !== id && m.media?.path === path);
        patch((d) => ({ chat: d.chat.filter((m) => m.id !== id) }));
        (async () => {
          const ok = await act(() => supabase.from('chat_messages').delete().eq('id', id));
          if (ok && orphan) await supabase.storage.from('media').remove([path!]);
        })();
      },

      blocked,
      report: (targetType, targetId, preview) => {
        (async () => {
          const ok = await act(() => supabase.from('reports').insert({ target_type: targetType, target_id: targetId, preview: preview.slice(0, 500) }));
          if (ok) showToast('Reported. A leader will take a look.');
        })();
      },
      resolveReport: (id, removeContent) => {
        const r = db.reports.find((x) => x.id === id);
        patch((d) => ({ reports: d.reports.map((x) => (x.id === id ? { ...x, resolved: true } : x)) }));
        (async () => {
          if (r && removeContent) {
            const table = r.targetType === 'chat' ? 'chat_messages' : r.targetType === 'comment' ? 'comments' : 'ideas';
            await supabase.from(table).delete().eq('id', r.targetId);
          }
          await act(() => supabase.from('reports').update({ resolved_at: new Date().toISOString(), resolved_by: myId }).eq('id', id));
        })();
      },
      block: (targetId) => {
        setBlocked((b) => (b.includes(targetId) ? b : [...b, targetId]));
        showToast(`You won't see ${nameOf(targetId).split(' ')[0]}'s messages anymore.`);
        act(() => supabase.from('blocks').insert({ blocked_id: targetId }));
      },
      unblock: (targetId) => {
        setBlocked((b) => b.filter((x) => x !== targetId));
        act(() => supabase.from('blocks').delete().eq('blocker_id', myId).eq('blocked_id', targetId));
      },

      toggleGoing: (eventId) => {
        const going = db.events.find((e) => e.id === eventId)?.going.includes(myId);
        patch((d) => ({ events: d.events.map((e) => (e.id === eventId ? { ...e, going: toggleIn(e.going, myId) } : e)) }));
        act(() =>
          going
            ? supabase.from('event_rsvps').delete().eq('event_id', eventId).eq('user_id', myId)
            : supabase.from('event_rsvps').insert({ event_id: eventId }),
        );
      },
      saveEvent: (e) => {
        const fields = { title: e.title, description: e.description, place: e.place, starts_at: e.startsAt };
        (async () => {
          if (e.id) {
            await act(() => supabase.from('events').update(fields).eq('id', e.id!));
            return;
          }
          const { data, error } = await supabase.from('events').insert(fields).select('id').single();
          if (error || !data) { showToast(FAIL); return; }
          await act(() => supabase.from('event_rsvps').insert({ event_id: data.id })); // автор события сразу «идёт»
        })();
      },
      deleteEvent: (id) => {
        patch((d) => ({ events: d.events.filter((e) => e.id !== id) }));
        act(() => supabase.from('events').delete().eq('id', id));
      },
      addIdea: (title, body) => {
        (async () => {
          const { data, error } = await supabase.from('ideas').insert({ title, body }).select('id').single();
          if (error || !data) { showToast(FAIL); return; }
          await act(() => supabase.from('idea_votes').insert({ idea_id: data.id })); // свой голос за свою идею
        })();
      },
      toggleVote: (ideaId) => {
        const voted = db.ideas.find((i) => i.id === ideaId)?.votes.includes(myId);
        patch((d) => ({ ideas: d.ideas.map((i) => (i.id === ideaId ? { ...i, votes: toggleIn(i.votes, myId) } : i)) }));
        act(() =>
          voted
            ? supabase.from('idea_votes').delete().eq('idea_id', ideaId).eq('user_id', myId)
            : supabase.from('idea_votes').insert({ idea_id: ideaId }),
        );
      },

      deviceSecrets,
      myThreads,
      unseenReplies,
      totalUnseenReplies: myThreads.reduce((n, t) => n + unseenReplies(t), 0),
      unansweredCount: db.threads.filter((t) => t.status === 'open' && lastFromAsker(t)).length,
      askQuestion: async (body, preferredLeaderId) => {
        // Секретный код рождается на телефоне и остаётся на нём. В базу уходит запрос
        // БЕЗ входа в аккаунт, и база хранит только отпечаток кода.
        const secret = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
        const { data, error } = await anonClient.rpc('anon_ask', {
          p_secret: secret, p_body: body, p_preferred_leader: preferredLeaderId ?? null,
        });
        if (error || !data) {
          showToast(error?.message.includes('Too many') ? 'Too many questions right now. Try again in a bit.' : FAIL);
          return null;
        }
        const id = data as string;
        saveSecrets([...secretsRef.current, { threadId: id, secret }]);
        saveSeen({ ...seen, [id]: 1 });
        const at = new Date().toISOString();
        patch((d) => ({
          threads: [
            ...d.threads,
            { id, secretHash: '', preferredLeaderId, status: 'open', createdAt: at, lastMessageAt: at, messages: [{ id: `tmp-${id}`, from: 'asker', body, createdAt: at }] },
          ],
        }));
        reload();
        return id;
      },
      replyAsAsker: (threadId, body) => {
        const secret = secretFor(threadId);
        if (!secret) return;
        const at = new Date().toISOString();
        const count = (db.threads.find((t) => t.id === threadId)?.messages.length ?? 0) + 1;
        patch((d) => ({
          threads: d.threads.map((t) =>
            t.id === threadId ? { ...t, lastMessageAt: at, messages: [...t.messages, { id: `tmp-${Date.now()}`, from: 'asker', body, createdAt: at }] } : t,
          ),
        }));
        saveSeen({ ...seen, [threadId]: count });
        act(() => anonClient.rpc('anon_reply', { p_secret: secret, p_body: body }));
      },
      replyAsLeader: (threadId, body) => {
        const at = new Date().toISOString();
        patch((d) => ({
          threads: d.threads.map((t) =>
            t.id === threadId ? { ...t, lastMessageAt: at, messages: [...t.messages, { id: `tmp-${Date.now()}`, from: myId, body, createdAt: at }] } : t,
          ),
        }));
        act(() => supabase.from('anon_messages').insert({ thread_id: threadId, sender: 'leader', leader_id: myId, body }));
      },
      closeThread: (threadId) => {
        patch((d) => ({ threads: d.threads.map((t) => (t.id === threadId ? { ...t, status: 'closed' as const } : t)) }));
        act(() => supabase.from('anon_threads').update({ status: 'closed' }).eq('id', threadId));
      },
      deleteThread: (threadId) => {
        const secret = secretFor(threadId);
        if (!secret) return;
        patch((d) => ({ threads: d.threads.filter((t) => t.id !== threadId) }));
        saveSecrets(secretsRef.current.filter((s) => s.threadId !== threadId));
        act(() => anonClient.rpc('anon_delete', { p_secret: secret }));
      },
      markThreadSeen: (threadId) => {
        const count = db.threads.find((t) => t.id === threadId)?.messages.length ?? 0;
        if (seen[threadId] !== count) saveSeen({ ...seen, [threadId]: count });
      },

      addSermon: async (s) => {
        const { data, error } = await supabase
          .from('sermons')
          .insert({ title: s.title, preacher: s.preacher, date: s.date, paragraphs: s.paragraphs })
          .select('id')
          .single();
        if (error || !data) { showToast(FAIL); return null; }
        await reload();
        return data.id as string;
      },
      savePost: (p) => {
        (async () => {
          // на один день — один пост: новый заменяет старый
          await supabase.from('daily_posts').delete().eq('day', p.day);
          await act(() =>
            supabase.from('daily_posts').insert({
              sermon_id: p.sermonId || null, day: p.day, publish_at: combine(p.day, p.time), quote: p.quote, note: p.note ?? null,
            }),
          );
        })();
      },
      deletePost: (id) => {
        patch((d) => ({ posts: d.posts.filter((p) => p.id !== id) }));
        act(() => supabase.from('daily_posts').delete().eq('id', id));
      },
      setUserRole: (targetId, role) => {
        patch((d) => ({ users: d.users.map((u) => (u.id === targetId ? { ...u, role } : u)) }));
        act(() => supabase.rpc('set_user_role', { p_user: targetId, p_role: role }));
      },
      sendGreeting: (toUserId, body) => {
        act(() => supabase.from('birthday_greetings').insert({ to_user_id: toUserId, body }));
      },
      dismissedGreetings,
      dismissGreeting: (id) => {
        setDismissed((x) => [...x, id]);
        act(() => supabase.from('birthday_greetings').update({ seen_at: new Date().toISOString() }).eq('id', id));
      },
      addAlbum: (title, items) => {
        (async () => {
          const { data, error } = await supabase.from('albums').insert({ title, date: todayISO() }).select('id').single();
          if (error || !data) { showToast(FAIL); return; }
          showToast('Uploading...');
          const uploaded: Row[] = [];
          for (const [position, item] of items.entries()) {
            const path = await uploadMedia(item, `albums/${data.id}`);
            if (path) uploaded.push({ album_id: data.id, kind: item.kind, storage_path: path, position });
          }
          if (uploaded.length > 0) await supabase.from('media_items').insert(uploaded);
          await reload();
          showToast(uploaded.length === items.length ? 'Album is up!' : `Album is up. ${items.length - uploaded.length} didn't upload.`);
        })();
      },
      deleteAlbum: (id) => {
        const paths = (db.albums.find((a) => a.id === id)?.items ?? []).map((i) => i.path).filter(Boolean) as string[];
        // Вместе с альбомом уходят и сообщения чата, в которые эти фото пересылали, — иначе в чате остались бы пустые плитки
        patch((d) => ({ albums: d.albums.filter((a) => a.id !== id), chat: d.chat.filter((m) => !m.media?.path || !paths.includes(m.media.path)) }));
        (async () => {
          const ok = await act(() => supabase.from('albums').delete().eq('id', id));
          if (!ok) return;
          if (paths.length > 0) {
            await supabase.storage.from('media').remove(paths);
            await supabase.from('chat_messages').delete().in('media_path', paths);
          }
          showToast('Album deleted.');
        })();
      },
      deleteAlbumItem: (albumId, itemId) => {
        const path = db.albums.find((a) => a.id === albumId)?.items.find((i) => i.id === itemId)?.path;
        patch((d) => ({
          albums: d.albums.map((a) => (a.id === albumId ? { ...a, items: a.items.filter((i) => i.id !== itemId) } : a)),
          chat: d.chat.filter((m) => !path || m.media?.path !== path),
        }));
        (async () => {
          const ok = await act(() => supabase.from('media_items').delete().eq('id', itemId));
          if (!ok) return;
          if (path) {
            await supabase.storage.from('media').remove([path]);
            await supabase.from('chat_messages').delete().eq('media_path', path);
          }
          showToast('Removed.');
        })();
      },

      notif,
      setNotif: (p) => {
        setNotifState((n) => ({ ...n, ...p }));
        const fields: Row = {};
        if (p.dailyWord !== undefined) fields.daily_word = p.dailyWord;
        if (p.chat !== undefined) fields.chat = p.chat;
        if (p.events !== undefined) fields.events = p.events;
        if (p.birthdays !== undefined) fields.birthdays = p.birthdays;
        act(() => supabase.from('notification_prefs').update(fields).eq('user_id', myId));
      },

      toast,
      showToast,
    };
  }, [db, userId, deviceSecrets, seen, deviceLoaded, sessionChecked, loadedFor, blocked, dismissedGreetings, notif, toast, showToast, reload, saveSecrets]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
