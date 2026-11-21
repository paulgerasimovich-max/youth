-- Значок «PASTOR» (решено владельцем 2026-11-21).
--
-- Пастор — это не отдельные права, а отметка поверх роли лидера: он может всё то же, что лидер,
-- и ничего сверх этого. Назначать лидеров и убирать людей из группы по-прежнему может только админ.
-- Отметку ставит и снимает только админ. Поставить её себе нельзя.

alter table public.profiles add column pastor boolean not null default false;
-- Пастор всегда лидер: отметка не может остаться на обычном участнике.
alter table public.profiles add constraint profiles_pastor_is_leader check (not pastor or role = 'leader');

-- Поставить / снять отметку пастора — только админ.
-- Если человек был обычным участником, он заодно становится лидером. Снятие отметки оставляет его лидером.
create function public.set_pastor(p_user uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only the group admin can pick the pastor' using errcode = '42501';
  end if;
  if p_on is null then
    raise exception 'Say yes or no' using errcode = '22023';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'You cannot change your own role' using errcode = '42501';
  end if;
  update public.profiles
     set pastor = p_on,
         role = case when p_on then 'leader' else role end
   where id = p_user and role <> 'admin';
  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.set_pastor(uuid, boolean) from public, anon;
grant execute on function public.set_pastor(uuid, boolean) to authenticated;

-- Снять лидера — значит снять и отметку пастора.
create or replace function public.set_user_role(p_user uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only the group admin can pick leaders' using errcode = '42501';
  end if;
  if p_role not in ('member', 'leader') then
    raise exception 'Role must be member or leader' using errcode = '22023';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'You cannot change your own role' using errcode = '42501';
  end if;
  update public.profiles
     set role = p_role,
         pastor = pastor and p_role = 'leader'
   where id = p_user and role <> 'admin';
  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
end;
$$;
