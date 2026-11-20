-- Новая жалоба -> уведомление лидерам.
-- В правилах группы обещано, что лидеры смотрят каждую жалобу в течение 24 часов (этого требуют магазины приложений),
-- поэтому лидер должен узнавать о жалобе сразу, а не когда сам заглянет в раздел.
-- В уведомлении нет ни текста сообщения, ни того, кто пожаловался: только «появилась жалоба».
-- Выключить его нельзя — это обязанность лидера, а не рассылка.

create function public.push_on_report() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  recipients uuid[];
begin
  select array_agg(p.id) into recipients
  from public.profiles p
  where p.approved and p.role in ('leader', 'admin') and p.id is distinct from new.reporter_id;
  perform public.push_send(recipients, 'New report', 'Someone flagged something. Take a look.', jsonb_build_object('type', 'report'));
  return null;
end;
$$;
revoke all on function public.push_on_report() from public, anon, authenticated;

create trigger push_on_report after insert on public.reports
  for each row execute function public.push_on_report();
