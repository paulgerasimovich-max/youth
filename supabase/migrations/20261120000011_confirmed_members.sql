-- Участник появляется в группе только после того, как подтвердил почту кодом из письма.
--
-- Раньше строка в списке участников создавалась сразу, как только кто-то ввёл адрес на экране входа, —
-- ещё до подтверждения. Любой мог вбить чужой или выдуманный адрес, и в Members появлялся «New member»,
-- которого лидер не мог отличить от настоящего человека (так 2026-11-20 в списке оказался адрес с опечаткой).
-- Теперь система входа по-прежнему запоминает адрес, которому отправила код, но профиль создаётся
-- в момент, когда код введён верно.

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
begin
  -- Убранному из группы код даже не отправляем.
  if exists (select 1 from public.removed_emails where email_hash = public.email_hash(new.email)) then
    raise exception 'This account was removed from the group' using errcode = '42501';
  end if;
  -- Почта ещё не подтверждена — человека в группе пока нет.
  if new.email_confirmed_at is null then
    return new;
  end if;
  insert into public.profiles (id, name, approved, agreed_at)
  values (
    new.id,
    coalesce(left(v_name, 80), 'New member'),
    not (select require_approval from public.app_settings),
    case when new.raw_user_meta_data ->> 'agreed' = 'true' then now() end
  )
  on conflict (id) do nothing;
  insert into public.notification_prefs (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- Код введён верно: система входа проставляет время подтверждения — в этот момент и создаём профиль.
create trigger on_auth_user_confirmed
  after update on auth.users
  for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_new_user();

-- Убираем из списка тех, кто попал в него без подтверждения. Данных у них нет: войти они не могли.
delete from public.profiles p
using auth.users u
where u.id = p.id and u.email_confirmed_at is null;
