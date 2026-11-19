-- То, что есть только в облаке Supabase: расписание, «живые» обновления, хранилище файлов.
-- (В локальных тестах этот файл не запускается.)

-- ---------- Расписание: автоудаление анонимных переписок через 7 дней ----------
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('anon-purge-expired', '23 * * * *', $$select public.anon_purge_expired()$$);

-- ---------- «Живые» обновления (сообщение появляется у всех сразу) ----------
-- Анонимные вопросы сюда НЕ входят.
alter publication supabase_realtime add table
  public.chat_messages,
  public.chat_reactions,
  public.comments,
  public.post_reactions,
  public.event_rsvps,
  public.idea_votes;

-- ---------- Хранилище фото и видео ----------
-- Закрытое: файл можно получить только войдя в аккаунт участника группы.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media', 'media', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime']
)
on conflict (id) do nothing;

create policy media_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select public.is_member()));

-- В чат каждый грузит только в свою папку chat/<свой id>/…; в альбомы — только лидеры.
create policy media_upload on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media'
    and (
      (
        (storage.foldername(name))[1] = 'chat'
        and (storage.foldername(name))[2] = (select auth.uid())::text
        and (select public.is_member())
      )
      or ((storage.foldername(name))[1] = 'albums' and (select public.is_leader()))
    )
  );

create policy media_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'media'
    and (owner_id = (select auth.uid())::text or (select public.is_leader()))
  );
