-- Running order number (#1, #2 …) shown in admin. Old orders are numbered by date; new ones continue the count.
create sequence if not exists public.shop_orders_seq;
alter table public.shop_orders add column if not exists seq bigint;
with r as (select id, row_number() over (order by created_at, id) as n from public.shop_orders)
update public.shop_orders o set seq = r.n from r where o.id = r.id and o.seq is null;
select setval('public.shop_orders_seq', coalesce((select max(seq) from public.shop_orders), 0) + 1, false);
alter table public.shop_orders alter column seq set default nextval('public.shop_orders_seq');
alter sequence public.shop_orders_seq owned by public.shop_orders.seq;
create unique index if not exists shop_orders_seq_key on public.shop_orders(seq);
grant usage on sequence public.shop_orders_seq to anon, authenticated;
