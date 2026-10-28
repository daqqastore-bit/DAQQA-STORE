-- Store visit tracking for the admin «Tracking» page (sessions, live visitors, product views, add-to-cart, sources, devices).
-- Visitors never read or write the table directly: they go through shop_track(); the admin reads totals through shop_track_stats().
create table if not exists public.shop_visits (
  id bigserial primary key,
  vid text not null,                 -- visitor (kept on the device)
  sid text not null,                 -- session (ends after 30 min with no activity)
  ev text not null default 'pv',     -- pv = page view, cart = added to cart, co = opened checkout
  path text,
  product_id bigint,
  src text,                          -- instagram / tiktok / facebook / whatsapp / google / direct / other
  dev text,                          -- mobile / desktop
  created_at timestamptz not null default now()
);
create index if not exists shop_visits_at on public.shop_visits(created_at);
alter table public.shop_visits enable row level security;

create table if not exists public.shop_live (sid text primary key, path text, seen_at timestamptz not null default now());
alter table public.shop_live enable row level security;

create or replace function public.shop_track(p_vid text, p_sid text, p_ev text, p_path text, p_pid bigint, p_src text, p_dev text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(p_sid, '') = '' or length(p_sid) > 64 or length(coalesce(p_vid, '')) > 64 then return; end if;
  insert into shop_live(sid, path, seen_at) values (p_sid, left(p_path, 200), now())
    on conflict (sid) do update set path = excluded.path, seen_at = now();
  if p_ev in ('pv', 'cart', 'co') then
    insert into shop_visits(vid, sid, ev, path, product_id, src, dev)
    values (left(p_vid, 64), left(p_sid, 64), p_ev, left(p_path, 200), p_pid, left(p_src, 20), left(p_dev, 10));
  end if;
  delete from shop_live where seen_at < now() - interval '1 hour';
end $$;
grant execute on function public.shop_track(text, text, text, text, bigint, text, text) to anon, authenticated;

-- totals for one period; p_unit = 'day' or 'hour' (Cairo time)
create or replace function public.shop_track_stats(p_from timestamptz, p_to timestamptz, p_unit text default 'day')
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not shop_is_admin() then raise exception 'not allowed'; end if;
  with v as (select * from shop_visits where created_at >= p_from and created_at < p_to),
  b as (select date_trunc(case when p_unit = 'hour' then 'hour' else 'day' end, created_at at time zone 'Africa/Cairo') as t, sid, vid, ev from v)
  select jsonb_build_object(
    'sessions', (select count(distinct sid) from v),
    'visitors', (select count(distinct vid) from v),
    'views', (select count(*) from v where ev = 'pv'),
    'cart_s', (select count(distinct sid) from v where ev = 'cart'),
    'co_s', (select count(distinct sid) from v where ev = 'co'),
    'pv_s', (select count(distinct sid) from v where product_id is not null and ev = 'pv'),
    'series', coalesce((select jsonb_agg(jsonb_build_object('t', to_char(t, 'YYYY-MM-DD"T"HH24:00'), 's', s) order by t) from (select t, count(distinct sid) s from b group by t) x), '[]'),
    'src', coalesce((select jsonb_object_agg(k, n) from (select coalesce(src, 'direct') k, count(distinct sid) n from v group by 1) x), '{}'),
    'dev', coalesce((select jsonb_object_agg(k, n) from (select coalesce(dev, 'mobile') k, count(distinct sid) n from v group by 1) x), '{}'),
    'pviews', coalesce((select jsonb_object_agg(product_id::text, n) from (select product_id, count(*) n from v where product_id is not null and ev = 'pv' group by 1) x), '{}'),
    'pcarts', coalesce((select jsonb_object_agg(product_id::text, n) from (select product_id, count(*) n from v where product_id is not null and ev = 'cart' group by 1) x), '{}'),
    'pages', coalesce((select jsonb_object_agg(k, n) from (select split_part(coalesce(path, '/'), '?', 1) k, count(*) n from v where ev = 'pv' group by 1) x), '{}')
  ) into r;
  return r;
end $$;
grant execute on function public.shop_track_stats(timestamptz, timestamptz, text) to authenticated;

create or replace function public.shop_live_now()
returns int language sql security definer set search_path = public as $$
  select case when shop_is_admin() then (select count(*)::int from shop_live where seen_at > now() - interval '3 minutes') else 0 end
$$;
grant execute on function public.shop_live_now() to authenticated;
