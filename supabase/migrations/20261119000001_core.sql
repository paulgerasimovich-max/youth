-- Youth Group — структура базы и правила доступа.
--
-- Главный принцип: КАЖДАЯ таблица закрыта по умолчанию (RLS включён, прав нет),
-- доступ открывается точечно. Приложению не доверяем — правила стоят здесь, в базе.
-- На каждое правило есть тест в supabase/tests (npm run test:db).
--
-- Личных данных минимум: имя, по желанию день и месяц рождения.
-- Email живёт только в системе входа (auth.users) и в эти таблицы не копируется.
-- Телефон и пароль не собираем вообще.

-- ============================================================
-- 1. Настройки группы (одна строка)
-- ============================================================
create table public.app_settings (
  id boolean primary key default true check (id),
  timezone text not null default 'America/Los_Angeles',
  -- если true — новый участник ничего не видит, пока его не одобрит лидер
  require_approval boolean not null default false
);
insert into public.app_settings default values;

-- ============================================================
-- 2. Люди
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  role text not null default 'member' check (role in ('member', 'leader', 'admin')),
  approved boolean not null default true,
  created_at timestamptz not null default now()
);

-- День рождения: по желанию, только день и месяц. Читать может только сам человек;
-- остальным отдаются готовые списки через функции ниже.
create table public.birthdays (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  month smallint not null check (month between 1 and 12),
  day smallint not null check (day between 1 and 31)
);

create table public.notification_prefs (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  daily_word boolean not null default true,
  chat boolean not null default true,
  events boolean not null default true,
  birthdays boolean not null default true
);

create table public.push_tokens (
  token text primary key check (char_length(token) between 10 and 300),
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

-- Кого человек заблокировал (его сообщения перестают показываться)
create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- ---------- Проверки «кто я» (используются в правилах) ----------
create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and approved);
$$;

create function public.is_leader() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and approved and role in ('leader', 'admin')
  );
$$;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and approved and role = 'admin');
$$;

create function public.is_blocked(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks where blocker_id = (select auth.uid()) and blocked_id = p_user
  );
$$;

-- ---------- Новый аккаунт -> профиль ----------
-- Роль всегда «участник», что бы ни прислало приложение. Лидеров назначает только админ.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
begin
  insert into public.profiles (id, name, approved)
  values (
    new.id,
    coalesce(left(v_name, 80), 'New member'),
    not (select require_approval from public.app_settings)
  );
  insert into public.notification_prefs (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 3. Проповеди и ежедневные посты
-- ============================================================
create table public.sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  preacher text not null default '' check (char_length(preacher) <= 120),
  date date not null,
  paragraphs text[] not null check (cardinality(paragraphs) between 1 and 400),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.daily_posts (
  id uuid primary key default gen_random_uuid(),
  sermon_id uuid references public.sermons (id) on delete set null,
  day date not null unique, -- на один день — один пост
  publish_at timestamptz not null, -- когда пост открывается участникам и уходит пуш
  quote text not null check (char_length(quote) between 1 and 6000),
  note text check (char_length(note) <= 1000),
  author_id uuid default auth.uid() references public.profiles (id) on delete set null,
  notified_at timestamptz, -- когда отправлен пуш (ставит сервер)
  created_at timestamptz not null default now()
);

create table public.post_reactions (
  post_id uuid not null references public.daily_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, emoji)
);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.daily_posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index comments_post_idx on public.comments (post_id, created_at);

-- ============================================================
-- 4. События и идеи
-- ============================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 4000),
  place text not null default '' check (char_length(place) <= 200),
  starts_at timestamptz not null,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index events_starts_idx on public.events (starts_at);

create table public.event_rsvps (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 1000),
  created_at timestamptz not null default now()
);

create table public.idea_votes (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);

-- ============================================================
-- 5. Фото и видео
-- ============================================================
create table public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  date date not null default current_date,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.media_items (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  kind text not null check (kind in ('photo', 'video')),
  storage_path text not null check (char_length(storage_path) between 1 and 400),
  duration_seconds integer check (duration_seconds >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index media_items_album_idx on public.media_items (album_id, position);

-- ============================================================
-- 6. Общий чат
-- ============================================================
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text check (char_length(body) between 1 and 4000),
  media_kind text check (media_kind in ('photo', 'video')),
  media_path text check (char_length(media_path) between 1 and 400),
  forwarded_from text check (char_length(forwarded_from) <= 120),
  created_at timestamptz not null default now(),
  check (body is not null or media_path is not null),
  check ((media_kind is null) = (media_path is null))
);
create index chat_messages_created_idx on public.chat_messages (created_at desc);

create table public.chat_reactions (
  message_id uuid not null references public.chat_messages (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

-- ============================================================
-- 7. Жалобы и поздравления
-- ============================================================
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid default auth.uid() references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('chat', 'comment', 'idea')),
  target_id uuid not null,
  preview text not null default '' check (char_length(preview) <= 500),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null
);

create table public.birthday_greetings (
  id uuid primary key default gen_random_uuid(),
  to_user_id uuid not null references public.profiles (id) on delete cascade,
  from_user_id uuid default auth.uid() references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

-- ============================================================
-- 8. Анонимные вопросы
-- ============================================================
-- В этих таблицах НЕТ ни одной колонки, указывающей на автора вопроса.
-- Автора знает только его телефон: там лежит секретный код, а здесь — лишь его
-- отпечаток (хэш). Все действия автора идут через функции anon_* БЕЗ входа в аккаунт.
create table public.anon_threads (
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null unique,
  -- пожелание «хочу, чтобы ответил…» (видят все лидеры)
  preferred_leader_id uuid references public.profiles (id) on delete set null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);
create index anon_threads_last_idx on public.anon_threads (last_message_at);

create table public.anon_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.anon_threads (id) on delete cascade,
  sender text not null check (sender in ('asker', 'leader')),
  -- для ответа лидера — кто ответил; для сообщения автора всегда пусто
  leader_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  check (sender = 'leader' or leader_id is null)
);
create index anon_messages_thread_idx on public.anon_messages (thread_id, created_at);

create function public.anon_touch_thread() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.anon_threads set last_message_at = new.created_at where id = new.thread_id;
  return new;
end;
$$;

create trigger anon_messages_touch
  after insert on public.anon_messages
  for each row execute function public.anon_touch_thread();

create function public.anon_hash(p_secret text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(p_secret, 'UTF8')), 'hex');
$$;

-- Сервер отказывается принимать анонимные действия, если вместе с ними пришёл вход
-- в аккаунт: так он физически не может связать вопрос с человеком.
create function public.anon_require_no_session() returns void
language plpgsql stable set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    raise exception 'Anonymous questions must be sent without a signed-in session'
      using errcode = '42501';
  end if;
end;
$$;

create function public.anon_ask(p_secret text, p_body text, p_preferred_leader uuid default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  perform public.anon_require_no_session();
  if p_secret is null or char_length(p_secret) < 32 or char_length(p_secret) > 200 then
    raise exception 'Bad secret' using errcode = '22023';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'Question must be 1-4000 characters' using errcode = '22023';
  end if;
  -- защита от заваливания вопросами: не больше 40 новых в час на всю группу
  if (select count(*) from public.anon_threads where created_at > now() - interval '1 hour') >= 40 then
    raise exception 'Too many questions right now. Try again in a bit.' using errcode = '54000';
  end if;
  if p_preferred_leader is not null and not exists (
    select 1 from public.profiles where id = p_preferred_leader and approved and role in ('leader', 'admin')
  ) then
    p_preferred_leader := null;
  end if;

  insert into public.anon_threads (secret_hash, preferred_leader_id)
  values (public.anon_hash(p_secret), p_preferred_leader)
  returning id into v_id;
  insert into public.anon_messages (thread_id, sender, body) values (v_id, 'asker', v_body);
  return v_id;
end;
$$;

-- Переписки по секретным кодам с этого телефона (вместе с ответами и именами лидеров)
create function public.anon_my_threads(p_secrets text[]) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v jsonb;
begin
  perform public.anon_require_no_session();
  if p_secrets is null or cardinality(p_secrets) = 0 then
    return '[]'::jsonb;
  end if;
  if cardinality(p_secrets) > 50 then
    raise exception 'Too many secrets' using errcode = '22023';
  end if;

  select coalesce(jsonb_agg(x.j order by x.last_message_at desc), '[]'::jsonb) into v
  from (
    select
      t.last_message_at,
      jsonb_build_object(
        'id', t.id,
        'status', t.status,
        'preferred_leader_id', t.preferred_leader_id,
        'created_at', t.created_at,
        'last_message_at', t.last_message_at,
        'messages', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', m.id, 'sender', m.sender, 'leader_id', m.leader_id, 'leader_name', p.name,
                'body', m.body, 'created_at', m.created_at
              )
              order by m.created_at, m.id
            ),
            '[]'::jsonb
          )
          from public.anon_messages m
          left join public.profiles p on p.id = m.leader_id
          where m.thread_id = t.id
        )
      ) as j
    from public.anon_threads t
    where t.secret_hash in (select public.anon_hash(s) from unnest(p_secrets) as s)
  ) x;
  return v;
end;
$$;

create function public.anon_reply(p_secret text, p_body text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_thread public.anon_threads;
  v_id uuid;
  v_body text := btrim(coalesce(p_body, ''));
begin
  perform public.anon_require_no_session();
  if char_length(v_body) < 1 or char_length(v_body) > 4000 then
    raise exception 'Message must be 1-4000 characters' using errcode = '22023';
  end if;
  select * into v_thread from public.anon_threads where secret_hash = public.anon_hash(p_secret);
  if not found then
    raise exception 'Conversation not found' using errcode = 'P0002';
  end if;
  if v_thread.status <> 'open' then
    raise exception 'This conversation is closed' using errcode = '42501';
  end if;
  if (select count(*) from public.anon_messages where thread_id = v_thread.id) >= 300 then
    raise exception 'This conversation is full' using errcode = '54000';
  end if;
  insert into public.anon_messages (thread_id, sender, body)
  values (v_thread.id, 'asker', v_body)
  returning id into v_id;
  return v_id;
end;
$$;

-- «Удалить сейчас»: стирает переписку для всех и навсегда
create function public.anon_delete(p_secret text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  perform public.anon_require_no_session();
  delete from public.anon_threads where secret_hash = public.anon_hash(p_secret);
  get diagnostics v_count = row_count;
  return v_count > 0;
end;
$$;

-- Автоудаление через 7 дней после последнего сообщения (запускается по расписанию)
create function public.anon_purge_expired() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  delete from public.anon_threads where last_message_at < now() - interval '7 days';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ============================================================
-- 9. Функции для приложения
-- ============================================================

-- У кого сегодня день рождения (видят все участники). 29 февраля в невисокосный год
-- празднуем 28-го.
create function public.birthdays_today() returns table (user_id uuid, name text)
language sql stable security definer set search_path = '' as $$
  with t as (
    select (now() at time zone (select timezone from public.app_settings))::date as d
  )
  select p.id, p.name
  from public.birthdays b
  join public.profiles p on p.id = b.user_id and p.approved
  cross join t
  where public.is_member()
    and (
      (b.month = extract(month from t.d) and b.day = extract(day from t.d))
      or (
        b.month = 2 and b.day = 29
        and extract(month from t.d) = 2 and extract(day from t.d) = 28
        and extract(day from (date_trunc('year', t.d) + interval '2 months - 1 day')) = 28
      )
    );
$$;

-- Все дни рождения с днём и месяцем — только лидерам (для поздравлений)
create function public.birthdays_for_leaders() returns table (user_id uuid, name text, month smallint, day smallint)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, b.month, b.day
  from public.birthdays b
  join public.profiles p on p.id = b.user_id and p.approved
  where public.is_leader();
$$;

-- Назначить / снять лидера — только админ. Себя и другого админа менять нельзя.
create function public.set_user_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only the lead pastor can pick leaders' using errcode = '42501';
  end if;
  if p_role not in ('member', 'leader') then
    raise exception 'Role must be member or leader' using errcode = '22023';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'You cannot change your own role' using errcode = '42501';
  end if;
  update public.profiles set role = p_role where id = p_user and role <> 'admin';
  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
end;
$$;

-- Одобрить нового участника (когда включён режим одобрения) — лидеры
create function public.approve_member(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_leader() then
    raise exception 'Only leaders can approve members' using errcode = '42501';
  end if;
  update public.profiles set approved = true where id = p_user;
end;
$$;

-- Удалить участника из группы — только админ
create function public.remove_member(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only the lead pastor can remove members' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'Use delete account for your own account' using errcode = '42501';
  end if;
  delete from auth.users where id = p_user;
end;
$$;

-- Удаление своего аккаунта (требование Apple / Google). Вместе с аккаунтом
-- уходят профиль, сообщения, комментарии, идеи, отметки.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;

-- Телефон сообщает адрес для пуш-уведомлений. Если этим телефоном раньше
-- пользовался другой аккаунт, адрес переезжает к текущему.
create function public.register_push_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, (select auth.uid()), p_platform)
  on conflict (token) do update
    set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end;
$$;

-- ============================================================
-- 10. Правила доступа (RLS)
-- ============================================================
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.birthdays enable row level security;
alter table public.notification_prefs enable row level security;
alter table public.push_tokens enable row level security;
alter table public.blocks enable row level security;
alter table public.sermons enable row level security;
alter table public.daily_posts enable row level security;
alter table public.post_reactions enable row level security;
alter table public.comments enable row level security;
alter table public.events enable row level security;
alter table public.event_rsvps enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_votes enable row level security;
alter table public.albums enable row level security;
alter table public.media_items enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reactions enable row level security;
alter table public.reports enable row level security;
alter table public.birthday_greetings enable row level security;
alter table public.anon_threads enable row level security;
alter table public.anon_messages enable row level security;

-- ---------- настройки ----------
create policy app_settings_read on public.app_settings for select to authenticated
  using ((select public.is_member()));
create policy app_settings_admin_update on public.app_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- профили: имя и роль видят участники группы; менять можно только своё имя ----------
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_member()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------- день рождения: только свой ----------
create policy birthdays_own on public.birthdays for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy notification_prefs_read_own on public.notification_prefs for select to authenticated
  using (user_id = (select auth.uid()));
create policy notification_prefs_update_own on public.notification_prefs for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy push_tokens_read_own on public.push_tokens for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_tokens_delete_own on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()));

create policy blocks_own on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid()))
  with check (blocker_id = (select auth.uid()) and (select public.is_member()));

-- ---------- проповеди и посты ----------
create policy sermons_read on public.sermons for select to authenticated
  using ((select public.is_member()));
create policy sermons_leader_insert on public.sermons for insert to authenticated
  with check ((select public.is_leader()) and created_by = (select auth.uid()));
create policy sermons_leader_update on public.sermons for update to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));
create policy sermons_leader_delete on public.sermons for delete to authenticated
  using ((select public.is_leader()));

-- участник видит пост только когда настало его время; лидер — всегда
create policy daily_posts_read on public.daily_posts for select to authenticated
  using ((select public.is_leader()) or ((select public.is_member()) and publish_at <= now()));
create policy daily_posts_leader_insert on public.daily_posts for insert to authenticated
  with check ((select public.is_leader()) and author_id = (select auth.uid()));
create policy daily_posts_leader_update on public.daily_posts for update to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));
create policy daily_posts_leader_delete on public.daily_posts for delete to authenticated
  using ((select public.is_leader()));

create policy post_reactions_read on public.post_reactions for select to authenticated
  using ((select public.is_member()));
create policy post_reactions_insert_own on public.post_reactions for insert to authenticated
  with check (
    user_id = (select auth.uid()) and (select public.is_member())
    and exists (select 1 from public.daily_posts p where p.id = post_id)
  );
create policy post_reactions_delete_own on public.post_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

create policy comments_read on public.comments for select to authenticated
  using ((select public.is_member()) and not public.is_blocked(user_id));
create policy comments_insert_own on public.comments for insert to authenticated
  with check (
    user_id = (select auth.uid()) and (select public.is_member())
    and exists (select 1 from public.daily_posts p where p.id = post_id)
  );
create policy comments_delete on public.comments for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_leader()));

-- ---------- события и идеи ----------
create policy events_read on public.events for select to authenticated
  using ((select public.is_member()));
create policy events_leader_insert on public.events for insert to authenticated
  with check ((select public.is_leader()) and created_by = (select auth.uid()));
create policy events_leader_update on public.events for update to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));
create policy events_leader_delete on public.events for delete to authenticated
  using ((select public.is_leader()));

create policy event_rsvps_read on public.event_rsvps for select to authenticated
  using ((select public.is_member()));
create policy event_rsvps_insert_own on public.event_rsvps for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member()));
create policy event_rsvps_delete_own on public.event_rsvps for delete to authenticated
  using (user_id = (select auth.uid()));

create policy ideas_read on public.ideas for select to authenticated
  using ((select public.is_member()) and not public.is_blocked(user_id));
create policy ideas_insert_own on public.ideas for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member()));
create policy ideas_delete on public.ideas for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_leader()));

create policy idea_votes_read on public.idea_votes for select to authenticated
  using ((select public.is_member()));
create policy idea_votes_insert_own on public.idea_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member()));
create policy idea_votes_delete_own on public.idea_votes for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- фото и видео ----------
create policy albums_read on public.albums for select to authenticated
  using ((select public.is_member()));
create policy albums_leader_insert on public.albums for insert to authenticated
  with check ((select public.is_leader()) and created_by = (select auth.uid()));
create policy albums_leader_update on public.albums for update to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));
create policy albums_leader_delete on public.albums for delete to authenticated
  using ((select public.is_leader()));

create policy media_items_read on public.media_items for select to authenticated
  using ((select public.is_member()));
create policy media_items_leader_insert on public.media_items for insert to authenticated
  with check ((select public.is_leader()));
create policy media_items_leader_update on public.media_items for update to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));
create policy media_items_leader_delete on public.media_items for delete to authenticated
  using ((select public.is_leader()));

-- ---------- чат ----------
create policy chat_messages_read on public.chat_messages for select to authenticated
  using ((select public.is_member()) and not public.is_blocked(user_id));
create policy chat_messages_insert_own on public.chat_messages for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_member()));
create policy chat_messages_delete on public.chat_messages for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_leader()));

create policy chat_reactions_read on public.chat_reactions for select to authenticated
  using ((select public.is_member()));
create policy chat_reactions_insert_own on public.chat_reactions for insert to authenticated
  with check (
    user_id = (select auth.uid()) and (select public.is_member())
    and exists (select 1 from public.chat_messages m where m.id = message_id)
  );
create policy chat_reactions_delete_own on public.chat_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- ---------- жалобы: подать может любой участник, читают и закрывают лидеры ----------
create policy reports_insert_own on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and (select public.is_member()));
create policy reports_leader_read on public.reports for select to authenticated
  using ((select public.is_leader()));
create policy reports_leader_update on public.reports for update to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

-- ---------- поздравления: видят только отправитель и получатель ----------
create policy greetings_read on public.birthday_greetings for select to authenticated
  using (to_user_id = (select auth.uid()) or from_user_id = (select auth.uid()));
create policy greetings_leader_insert on public.birthday_greetings for insert to authenticated
  with check ((select public.is_leader()) and from_user_id = (select auth.uid()));
create policy greetings_mark_seen on public.birthday_greetings for update to authenticated
  using (to_user_id = (select auth.uid())) with check (to_user_id = (select auth.uid()));

-- ---------- анонимные вопросы: напрямую таблицы видят только лидеры ----------
create policy anon_threads_leader_read on public.anon_threads for select to authenticated
  using ((select public.is_leader()));
create policy anon_threads_leader_close on public.anon_threads for update to authenticated
  using ((select public.is_leader())) with check ((select public.is_leader()));

create policy anon_messages_leader_read on public.anon_messages for select to authenticated
  using ((select public.is_leader()));
create policy anon_messages_leader_reply on public.anon_messages for insert to authenticated
  with check (
    (select public.is_leader())
    and sender = 'leader'
    and leader_id = (select auth.uid())
    and exists (select 1 from public.anon_threads t where t.id = thread_id and t.status = 'open')
  );

-- ============================================================
-- 11. Права: сначала забираем всё, потом выдаём по списку
-- ============================================================
revoke all on all tables in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

-- гость (без входа) не получает НИ ОДНОЙ таблицы — только анонимные функции ниже
grant select on public.app_settings to authenticated;
grant update (timezone, require_approval) on public.app_settings to authenticated;

grant select on public.profiles to authenticated;
grant update (name) on public.profiles to authenticated; -- роль и одобрение менять нельзя

grant select, insert, delete on public.birthdays to authenticated;
grant update (month, day) on public.birthdays to authenticated;

grant select on public.notification_prefs to authenticated;
grant update (daily_word, chat, events, birthdays) on public.notification_prefs to authenticated;

grant select, delete on public.push_tokens to authenticated;
grant select, insert, delete on public.blocks to authenticated;

grant select, delete on public.sermons to authenticated;
grant insert (title, preacher, date, paragraphs, created_by) on public.sermons to authenticated;
grant update (title, preacher, date, paragraphs) on public.sermons to authenticated;

grant select, delete on public.daily_posts to authenticated;
grant insert (sermon_id, day, publish_at, quote, note, author_id) on public.daily_posts to authenticated;
grant update (sermon_id, day, publish_at, quote, note) on public.daily_posts to authenticated;

grant select, delete on public.post_reactions to authenticated;
grant insert (post_id, user_id, emoji) on public.post_reactions to authenticated;

grant select, delete on public.comments to authenticated;
grant insert (post_id, user_id, body) on public.comments to authenticated;

grant select, delete on public.events to authenticated;
grant insert (title, description, place, starts_at, created_by) on public.events to authenticated;
grant update (title, description, place, starts_at) on public.events to authenticated;

grant select, delete on public.event_rsvps to authenticated;
grant insert (event_id, user_id) on public.event_rsvps to authenticated;

grant select, delete on public.ideas to authenticated;
grant insert (user_id, title, body) on public.ideas to authenticated;

grant select, delete on public.idea_votes to authenticated;
grant insert (idea_id, user_id) on public.idea_votes to authenticated;

grant select, delete on public.albums to authenticated;
grant insert (title, date, created_by) on public.albums to authenticated;
grant update (title, date) on public.albums to authenticated;

grant select, delete on public.media_items to authenticated;
grant insert (album_id, kind, storage_path, duration_seconds, position) on public.media_items to authenticated;
grant update (position) on public.media_items to authenticated;

grant select, delete on public.chat_messages to authenticated;
grant insert (user_id, body, media_kind, media_path, forwarded_from) on public.chat_messages to authenticated;

grant select, delete on public.chat_reactions to authenticated;
grant insert (message_id, user_id, emoji) on public.chat_reactions to authenticated;

grant select on public.reports to authenticated;
grant insert (reporter_id, target_type, target_id, preview) on public.reports to authenticated;
grant update (resolved_at, resolved_by) on public.reports to authenticated;

grant select on public.birthday_greetings to authenticated;
grant insert (to_user_id, from_user_id, body) on public.birthday_greetings to authenticated;
grant update (seen_at) on public.birthday_greetings to authenticated;

grant select on public.anon_threads to authenticated;
grant update (status) on public.anon_threads to authenticated;
grant select on public.anon_messages to authenticated;
grant insert (thread_id, sender, leader_id, body) on public.anon_messages to authenticated;

-- функции
grant execute on function public.is_member() to authenticated;
grant execute on function public.is_leader() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_blocked(uuid) to authenticated;
grant execute on function public.birthdays_today() to authenticated;
grant execute on function public.birthdays_for_leaders() to authenticated;
grant execute on function public.set_user_role(uuid, text) to authenticated;
grant execute on function public.approve_member(uuid) to authenticated;
grant execute on function public.remove_member(uuid) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.register_push_token(text, text) to authenticated;

-- анонимные функции — только для гостя (без входа). Вошедшему они не выданы вовсе,
-- а внутри стоит ещё одна проверка «нет сессии».
grant execute on function public.anon_ask(text, text, uuid) to anon;
grant execute on function public.anon_my_threads(text[]) to anon;
grant execute on function public.anon_reply(text, text) to anon;
grant execute on function public.anon_delete(text) to anon;
