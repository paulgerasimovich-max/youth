-- Подтверждение возраста (13+) и согласие с правилами группы.
-- Приложение только для тех, кому 13 или больше (решение владельца), а магазины приложений требуют,
-- чтобы в приложении с перепиской человек принял правила до того, как начнёт писать.
-- В профиле храним только момент, когда человек это подтвердил. Поставить отметку за другого или снять её нельзя.

alter table public.profiles add column agreed_at timestamptz;

-- Новый аккаунт: если человек поставил обе галочки на экране регистрации, отметка ставится сразу.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
begin
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

-- Тот, кто вошёл без этого шага (например, создал аккаунт через «Sign in»), подтверждает на отдельном экране.
create function public.accept_rules() returns void
language sql security definer set search_path = '' as $$
  update public.profiles set agreed_at = now() where id = (select auth.uid()) and agreed_at is null;
$$;
revoke all on function public.accept_rules() from public, anon;
grant execute on function public.accept_rules() to authenticated, service_role;
