-- «الشحن علينا»: when the admin waives the shipping on an order, the customer sees
-- "🎁 الشحن علينا! … الإجمالي الجديد X بدل Y" on «طلباتي» and the order page.
-- ship_was = the shipping the customer was charged before it was waived (null = not waived)
alter table public.shop_orders add column if not exists ship_was numeric(12,2);

-- guests' tracking also returns the shipping + what it was before
create or replace function public.shop_track_order(p_code text, p_phone text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', o.code, 'status', o.status, 'total', o.total, 'shipping', o.shipping, 'ship_was', o.ship_was, 'created_at', o.created_at, 'cancelled_at', o.cancelled_at, 'cancelled_by', o.cancelled_by,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'image', i.image, 'options', i.options)) from public.shop_order_items i where i.order_id = o.id), '[]'::jsonb))
  from public.shop_orders o
  where o.code = upper(trim(p_code))
    and regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
$$;
grant execute on function public.shop_track_order(text, text) to anon, authenticated;
