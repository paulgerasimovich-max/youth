-- Админ — это права (назначать лидеров, убирать людей из группы), а не звание «пастор».
-- Владелец группы — админ и при этом обычный лидер; пастор — другой человек (решено владельцем 2026-11-21).
-- Поэтому в сообщениях об отказе больше не пишем «lead pastor». Сами правила не меняются.

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
  update public.profiles set role = p_role where id = p_user and role <> 'admin';
  if not found then
    raise exception 'Member not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.remove_member(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
begin
  if not public.is_admin() then
    raise exception 'Only the group admin can remove members' using errcode = '42501';
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
