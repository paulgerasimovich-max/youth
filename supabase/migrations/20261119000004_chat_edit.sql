-- Правка своих сообщений в чате, как в мессенджерах.
-- Менять можно только текст, только автору и только не пересланное сообщение
-- (иначе получилось бы приписать свои слова тому, от кого оно переслано).
-- Отметку «изменено» ставит сервер — убрать или подделать её из приложения нельзя.

alter table public.chat_messages add column edited_at timestamptz;

create policy chat_messages_update_own on public.chat_messages for update to authenticated
  using (user_id = (select auth.uid()) and forwarded_from is null and (select public.is_member()))
  with check (user_id = (select auth.uid()) and forwarded_from is null and (select public.is_member()));

grant update (body) on public.chat_messages to authenticated;

create function public.chat_messages_mark_edited() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;
revoke all on function public.chat_messages_mark_edited() from public, anon, authenticated;

create trigger chat_messages_mark_edited before update on public.chat_messages
  for each row execute function public.chat_messages_mark_edited();
