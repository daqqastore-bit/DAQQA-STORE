-- Admin edits a buyer's options after the order is placed (order details → «تعديل الاختيارات»).
-- Changed options carry chg = true + was = the original pick; the customer then sees
-- «تم تغيير اختيارات المشتري بعد تواصل فريق العمل المسؤول» on the order. Price stays as ordered.
-- Safe to run twice.

create or replace function public.shop_admin_item_opts(p_item bigint, p_opts jsonb, p_image text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.shop_is_admin() then raise exception 'not allowed'; end if;
  if jsonb_typeof(p_opts) <> 'array' then raise exception 'bad options'; end if;
  update public.shop_order_items
     set options = case when jsonb_array_length(p_opts) > 0 then p_opts end,
         image = coalesce(nullif(p_image, ''), image)
   where id = p_item;
  if not found then raise exception 'item not found'; end if;
end $$;
revoke all on function public.shop_admin_item_opts(bigint, jsonb, text) from public, anon;
grant execute on function public.shop_admin_item_opts(bigint, jsonb, text) to authenticated;

-- guests' order tracking now also returns each item's options (so the change notice shows there too)
create or replace function public.shop_track_order(p_code text, p_phone text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('code', o.code, 'status', o.status, 'total', o.total, 'created_at', o.created_at, 'cancelled_at', o.cancelled_at, 'cancelled_by', o.cancelled_by,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'image', i.image, 'options', i.options)) from public.shop_order_items i where i.order_id = o.id), '[]'::jsonb))
  from public.shop_orders o
  where o.code = upper(trim(p_code))
    and regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
$$;
grant execute on function public.shop_track_order(text, text) to anon, authenticated;
