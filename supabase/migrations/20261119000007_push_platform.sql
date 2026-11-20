-- Уведомления: то, что есть только в облаке Supabase (в локальных тестах этот файл не запускается).

-- Запросы из базы наружу — ими уведомления уходят в сервис Expo Push
create extension if not exists pg_net;

-- Supabase при включении расширения сам выдаёт право на запросы наружу гостю и вошедшему, и забрать его
-- нам не дают (право выдано самой платформой — строки ниже остаются на случай, если это изменится).
-- Защита здесь другая и она проверена: схема net не открыта наружу, из приложения её функции не вызвать
-- («Invalid schema: net»), а наши функции отправки не выданы никому («permission denied for function push_send»).
revoke all on all functions in schema net from public, anon, authenticated;
revoke usage on schema net from anon, authenticated;

-- Расписание
select cron.schedule('push-daily-word', '* * * * *', $$select public.push_due_daily_posts()$$);
select cron.schedule('push-event-reminders', '*/5 * * * *', $$select public.push_event_reminders()$$);
select cron.schedule('push-prune-tokens', '17 9 * * *', $$select public.push_prune_tokens()$$);

-- Серверной роли — те же права, что и на остальные функции
grant execute on all functions in schema public to service_role;
