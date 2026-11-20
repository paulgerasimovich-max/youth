-- Удаление участника из группы главным лидером — так, чтобы он не мог тут же зарегистрироваться заново.
--
-- Регистрация открытая, поэтому просто удалить аккаунт мало: человек войдёт с той же почтой через минуту.
-- Запоминаем не саму почту, а её отпечаток (как с анонимными вопросами): узнать по нему адрес нельзя,
-- а проверить «этого человека уже убирали» — можно. Читать этот список из приложения не может никто.
-- Вернуть человека может только владелец базы: удалить строку из removed_emails.

create table public.removed_emails (
  email_hash text primary key,
  removed_at timestamptz not null default now(),
  removed_by uuid references public.profiles (id) on delete set null
);
alter table public.removed_emails enable row level security;
revoke all on public.removed_emails from anon, authenticated;
grant all on public.removed_emails to service_role;

create function public.email_hash(p_email text) returns text
language sql immutable set search_path = '' as $$
  select encode(sha256(convert_to(lower(btrim(coalesce(p_email, ''))), 'UTF8')), 'hex');
$$;
revoke all on function public.email_hash(text) from public, anon, authenticated;

create or replace function public.remove_member(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Only the lead pastor can remove members' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'Use delete account for your own account' using errcode = '42501';
  end if;
  select email into v_email from auth.users where id = p_user;
  if v_email is not null then
    insert into public.removed_emails (email_hash, removed_by)
    values (public.email_hash(v_email), (select auth.uid()))
    on conflict (email_hash) do nothing;
  end if;
  delete from auth.users where id = p_user;
end;
$$;

-- Новый аккаунт: убранного из группы не пускаем обратно.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
begin
  if exists (select 1 from public.removed_emails where email_hash = public.email_hash(new.email)) then
    raise exception 'This account was removed from the group' using errcode = '42501';
  end if;
  insert into public.profiles (id, name, approved, agreed_at)
  values (
    new.id,
    coalesce(left(v_name, 80), 'New member'),
    not (select require_approval from public.app_settings),
    case when new.raw_user_meta_data ->> 'agreed' = 'true' then now() end
  );
  insert into public.notification_prefs (user_id) values (new.id);
  return new;
end;
$$;
