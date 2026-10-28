-- «نوتفكشن وهمية» → real phone notifications: the dashboard queues the alerts here, pg_cron sends each one at its moment
-- through the order-push edge function (same path as a real order), so they arrive with the phone locked. Nothing touches orders.
-- Run once in Supabase → SQL Editor.
create extension if not exists pg_cron;
create table if not exists private.shop_fake_queue (id bigserial primary key, send_at timestamptz not null, body jsonb not null, sent boolean not null default false);
create index if not exists shop_fake_queue_due on private.shop_fake_queue (send_at) where not sent;
create or replace function private.shop_fake_tick() returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in update private.shop_fake_queue set sent = true
      where id in (select id from private.shop_fake_queue where not sent and send_at <= now() order by send_at limit 20 for update skip locked)
      returning body, send_at loop
    if r.send_at > now() - interval '1 minute' then perform private.shop_push_send(jsonb_build_object('fake', r.body)); end if;
  end loop;
  delete from private.shop_fake_queue where sent and send_at < now() - interval '1 day';
end $$;
-- admin only: replaces the alerts still waiting with these [{at: epoch ms, title, body, tag}] ([] = stop)
create or replace function public.shop_fake_push(items jsonb) returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.shop_is_admin() then raise exception 'not allowed'; end if;
  delete from private.shop_fake_queue where not sent;
  insert into private.shop_fake_queue (send_at, body)
    select to_timestamp((x->>'at')::double precision / 1000), jsonb_build_object('title', x->>'title', 'body', x->>'body', 'tag', x->>'tag')
    from (select x from jsonb_array_elements(coalesce(items, '[]'::jsonb)) x limit 500) s;
  get diagnostics n = row_count; return n;
end $$;
grant execute on function public.shop_fake_push(jsonb) to authenticated;
select cron.schedule('dq-fake-push', '1 seconds', 'select private.shop_fake_tick()');
