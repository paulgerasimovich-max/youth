-- Серверная роль (service_role) — это «ключ от сервера»: им пользуются только наши
-- серверные функции (например, рассылка пушей), в приложение он не попадает.
-- В новых проектах Supabase эта роль не получает права на таблицы автоматически,
-- поэтому выдаём их явно.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
