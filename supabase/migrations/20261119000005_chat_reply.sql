-- Ответ на конкретное сообщение в чате (свайп по сообщению, как в мессенджерах).
-- Сообщение помнит, на какое оно отвечает. Если исходное удалили — ответ остаётся, просто без цитаты.
-- Поменять «на что отвечаю» после отправки нельзя: права на изменение этого поля нет.

alter table public.chat_messages
  add column reply_to uuid references public.chat_messages (id) on delete set null;

create index chat_messages_reply_to_idx on public.chat_messages (reply_to) where reply_to is not null;

grant insert (reply_to) on public.chat_messages to authenticated;
