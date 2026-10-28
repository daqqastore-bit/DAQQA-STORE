-- Security page: every device that opened the admin dashboard (last seen); "online now" comes from realtime presence
-- Run once in Supabase → SQL Editor.
create table if not exists public.shop_admin_devices (
  id text primary key,
  email text,
  kind text,
  browser text,
  os text,
  model text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.shop_admin_devices enable row level security;
drop policy if exists "admin all" on public.shop_admin_devices;
create policy "admin all" on public.shop_admin_devices for all to authenticated using (public.shop_is_admin()) with check (public.shop_is_admin());
