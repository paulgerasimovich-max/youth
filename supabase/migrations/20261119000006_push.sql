-- Push-уведомления: кому и когда они уходят.
--
-- Отправляет сама база — запросом в сервис Expo Push (расширение pg_net, есть только в облаке Supabase;
-- в локальных тестах вместо него подставляется заглушка, которая просто записывает, что ушло бы).
-- Приложение ничего из этого вызвать не может: права на функции не выданы никому, они срабатывают сами —
-- от появления сообщения, события, поздравления или по расписанию.
--
-- Чего здесь нет намеренно: уведомлений по анонимным вопросам. Пуш «тебе ответили» выдал бы телефон автора.

alter table public.events add column reminded_at timestamptz; -- когда ушло напоминание (ставит сервер)

-- Короткая выдержка для текста уведомления: одна строка, не длиннее n знаков
create function public.push_preview(p_text text, p_max integer) returns text
language sql immutable set search_path = '' as $$
  select case
    when char_length(t) > p_max then left(t, p_max - 1) || '…'
    else t
  end
  from (select btrim(regexp_replace(coalesce(p_text, ''), '\s+', ' ', 'g')) as t) s;
$$;

-- Разослать одно уведомление списку людей (на все их телефоны). Возвращает, на сколько телефонов ушло.
-- Ошибка отправки никогда не должна ломать само действие (отправку сообщения, создание события) — поэтому она гасится.
create function public.push_send(p_users uuid[], p_title text, p_body text, p_data jsonb) returns integer
language plpgsql security definer set search_path = '' as $$
declare
  batch jsonb;
  sent integer := 0;
begin
  if p_users is null or cardinality(p_users) = 0 then
    return 0;
  end if;
  if to_regproc('net.http_post') is null then
    return 0; -- нет расширения для запросов наружу — отправлять нечем
  end if;
  for batch in
    select jsonb_agg(jsonb_build_object(
      'to', t.token, 'title', p_title, 'body', p_body, 'data', coalesce(p_data, '{}'::jsonb), 'sound', 'default'
    ))
    from (
      select token, (row_number() over (order by token) - 1) / 100 as chunk -- сервис принимает до 100 за раз
      from public.push_tokens
      where user_id = any (p_users)
    ) t
    group by t.chunk
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := batch,
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
    sent := sent + jsonb_array_length(batch);
  end loop;
  return sent;
exception when others then
  return 0;
end;
$$;

-- ---------- Чат: новое сообщение -> всем, кроме автора ----------
-- Не получают: те, кто выключил уведомления чата, и те, кто заблокировал автора.
create function public.push_on_chat_message() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  sender text;
  recipients uuid[];
begin
  select name into sender from public.profiles where id = new.user_id;
  select array_agg(p.id) into recipients
  from public.profiles p
  join public.notification_prefs n on n.user_id = p.id and n.chat
  where p.approved
    and p.id <> new.user_id
    and not exists (select 1 from public.blocks b where b.blocker_id = p.id and b.blocked_id = new.user_id);
  perform public.push_send(
    recipients,
    coalesce(sender, 'Group chat'),
    case
      when new.body is not null then public.push_preview(new.body, 140)
      when new.media_kind = 'video' then 'Sent a video'
      else 'Sent a photo'
    end,
    jsonb_build_object('type', 'chat')
  );
  return null;
end;
$$;
create trigger push_on_chat_message after insert on public.chat_messages
  for each row execute function public.push_on_chat_message();

-- ---------- События: новое событие -> всем, кроме создавшего ----------
create function public.push_on_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  tz text;
  recipients uuid[];
begin
  select timezone into tz from public.app_settings;
  select array_agg(p.id) into recipients
  from public.profiles p
  join public.notification_prefs n on n.user_id = p.id and n.events
  where p.approved and p.id is distinct from new.created_by;
  perform public.push_send(
    recipients,
    'New event',
    public.push_preview(new.title, 80) || ' · ' || to_char(new.starts_at at time zone tz, 'Dy, Mon FMDD, FMHH12:MI AM'),
    jsonb_build_object('type', 'event', 'id', new.id)
  );
  return null;
end;
$$;
create trigger push_on_event after insert on public.events
  for each row execute function public.push_on_event();

-- Перенесли событие — напоминание должно уйти заново
create function public.events_reset_reminder() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.starts_at is distinct from old.starts_at then
    new.reminded_at := null;
  end if;
  return new;
end;
$$;
create trigger events_reset_reminder before update on public.events
  for each row execute function public.events_reset_reminder();

-- Напоминание за два часа до начала — тем, кто нажал «I'm in». Запускается по расписанию.
create function public.push_event_reminders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  tz text;
  ev record;
  recipients uuid[];
  total integer := 0;
begin
  select timezone into tz from public.app_settings;
  for ev in
    select * from public.events
    where reminded_at is null and starts_at > now() and starts_at <= now() + interval '2 hours'
    for update skip locked
  loop
    -- событие создали совсем перед началом — о нём только что ушло «New event», второй раз не дёргаем
    if ev.created_at <= ev.starts_at - interval '3 hours' then
      select array_agg(p.id) into recipients
      from public.event_rsvps r
      join public.profiles p on p.id = r.user_id and p.approved
      join public.notification_prefs n on n.user_id = p.id and n.events
      where r.event_id = ev.id;
      total := total + public.push_send(
        recipients,
        public.push_preview(ev.title, 80),
        'Starts at ' || to_char(ev.starts_at at time zone tz, 'FMHH12:MI AM')
          || case when ev.place <> '' then ' · ' || public.push_preview(ev.place, 60) else '' end,
        jsonb_build_object('type', 'event', 'id', ev.id)
      );
    end if;
    update public.events set reminded_at = now() where id = ev.id;
  end loop;
  return total;
end;
$$;

-- ---------- Поздравление с днём рождения -> только тому, кого поздравили ----------
create function public.push_on_greeting() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  sender text;
  recipients uuid[];
begin
  select split_part(name, ' ', 1) into sender from public.profiles where id = new.from_user_id;
  select array_agg(p.id) into recipients
  from public.profiles p
  join public.notification_prefs n on n.user_id = p.id and n.birthdays
  where p.approved and p.id = new.to_user_id;
  perform public.push_send(
    recipients,
    'Happy birthday! 🎉',
    coalesce(sender, 'A leader') || ' sent you a note',
    jsonb_build_object('type', 'greeting')
  );
  return null;
end;
$$;
create trigger push_on_greeting after insert on public.birthday_greetings
  for each row execute function public.push_on_greeting();

-- ---------- Слово дня: в назначенное время -> всем, у кого оно включено ----------
-- Запускается по расписанию каждую минуту. Каждый пост уходит ровно один раз (notified_at).
create function public.push_due_daily_posts() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  post record;
  recipients uuid[];
  total integer := 0;
begin
  for post in
    select * from public.daily_posts
    where notified_at is null and publish_at <= now() and publish_at > now() - interval '12 hours'
    order by publish_at
    for update skip locked
  loop
    select array_agg(p.id) into recipients
    from public.profiles p
    join public.notification_prefs n on n.user_id = p.id and n.daily_word
    where p.approved;
    total := total + public.push_send(
      recipients, 'Today''s word', public.push_preview(post.quote, 140), jsonb_build_object('type', 'post', 'id', post.id)
    );
    update public.daily_posts set notified_at = now() where id = post.id;
  end loop;
  -- давно прошедшие и так и не отправленные — просто закрываем, чтобы не висели
  update public.daily_posts set notified_at = now() where notified_at is null and publish_at <= now() - interval '12 hours';
  return total;
end;
$$;

-- Лидер перенёс пост на более позднее время — уведомление должно уйти в новое время
create function public.daily_posts_reset_notified() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.publish_at is distinct from old.publish_at and new.publish_at > now() then
    new.notified_at := null;
  end if;
  return new;
end;
$$;
create trigger daily_posts_reset_notified before update on public.daily_posts
  for each row execute function public.daily_posts_reset_notified();

-- ---------- Уборка: адреса телефонов, которые не заходили два месяца ----------
create function public.push_prune_tokens() returns integer
language sql security definer set search_path = '' as $$
  with gone as (delete from public.push_tokens where updated_at < now() - interval '60 days' returning 1)
  select count(*)::integer from gone;
$$;

-- Никому из приложения эти функции не выданы: ни гостю, ни вошедшему.
revoke all on function public.push_preview(text, integer) from public, anon, authenticated;
revoke all on function public.push_send(uuid[], text, text, jsonb) from public, anon, authenticated;
revoke all on function public.push_on_chat_message() from public, anon, authenticated;
revoke all on function public.push_on_event() from public, anon, authenticated;
revoke all on function public.events_reset_reminder() from public, anon, authenticated;
revoke all on function public.push_event_reminders() from public, anon, authenticated;
revoke all on function public.push_on_greeting() from public, anon, authenticated;
revoke all on function public.push_due_daily_posts() from public, anon, authenticated;
revoke all on function public.daily_posts_reset_notified() from public, anon, authenticated;
revoke all on function public.push_prune_tokens() from public, anon, authenticated;
