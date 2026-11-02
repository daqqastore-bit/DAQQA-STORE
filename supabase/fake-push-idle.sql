-- Fake-alerts timer only runs while alerts are waiting (it used to tick every second all day:
-- ~85k runs + log lines a day, and a 67 MB run history in the database).
-- ابدأ in «نوتفكشن وهمية» turns the timer on; it turns itself off once the last alert is sent.
-- Run once in Supabase → SQL Editor.
create or replace function private.shop_fake_tick() returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in update private.shop_fake_queue set sent = true
      where id in (select id from private.shop_fake_queue where not sent and send_at <= now() order by send_at limit 20 for update skip locked)
      returning body, send_at loop
    if r.send_at > now() - interval '1 minute' then perform private.shop_push_send(jsonb_build_object('fake', r.body)); end if;
  end loop;
  delete from private.shop_fake_queue where sent and send_at < now() - interval '1 day';
  if not exists (select 1 from private.shop_fake_queue where not sent) then
    begin perform cron.unschedule('dq-fake-push'); exception when others then null; end;
  end if;
end $$;

create or replace function public.shop_fake_push(items jsonb) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.shop_is_admin() then raise exception 'not allowed'; end if;
  delete from private.shop_fake_queue where not sent;
  insert into private.shop_fake_queue (send_at, body)
    select to_timestamp((x->>'at')::double precision / 1000), jsonb_build_object('title', x->>'title', 'body', x->>'body', 'tag', x->>'tag', 'endpoint', x->>'endpoint')
    from (select x from jsonb_array_elements(coalesce(items, '[]'::jsonb)) x limit 500) s;
  get diagnostics n = row_count;
  if n > 0 then perform cron.schedule('dq-fake-push', '1 seconds', 'select private.shop_fake_tick()'); end if;
  return n;
end $$;
grant execute on function public.shop_fake_push(jsonb) to authenticated;

-- stop the timer now if nothing is waiting, and clear its old run history
do $$ begin
  if not exists (select 1 from private.shop_fake_queue where not sent) then
    begin perform cron.unschedule('dq-fake-push'); exception when others then null; end;
  end if;
end $$;
delete from cron.job_run_details where start_time < now() - interval '1 day';
