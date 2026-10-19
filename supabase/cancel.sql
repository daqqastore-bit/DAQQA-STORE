alter table public.shop_orders add column if not exists cancelled_at timestamptz;
alter table public.shop_orders add column if not exists cancelled_by text;
-- customers can cancel their own order while it is still "new" or "confirmed" (not after it ships)
create or replace function public.shop_cancel_order(p_code text, p_phone text default null, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.shop_orders; t timestamptz := now();
begin
  select * into o from public.shop_orders where code = upper(trim(p_code)) for update;
  if not found or not ((auth.uid() is not null and o.user_id = auth.uid())
     or regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) then
    raise exception 'الطلب مش موجود';
  end if;
  if o.status = 'cancelled' then return jsonb_build_object('code', o.code, 'status', o.status, 'cancelled_at', o.cancelled_at); end if;
  if o.status not in ('new', 'confirmed') then raise exception 'الطلب خرج للشحن ومينفعش يتلغي دلوقتي، كلمنا على واتساب'; end if;
  -- the stock trigger gives the pieces back; the note tells the admin who cancelled and when
  update public.shop_orders set status = 'cancelled', cancelled_at = t, cancelled_by = 'customer',
    admin_note = concat_ws(E'\n', nullif(admin_note, ''), 'تم الإلغاء من العميل ' || o.customer_name || ' · ' || to_char(t at time zone 'Africa/Cairo', 'DD/MM/YYYY · HH12:MI AM')
      || coalesce(E'\nسبب الإلغاء: ' || nullif(left(trim(p_reason), 300), ''), ''))
  where id = o.id;
  return jsonb_build_object('code', o.code, 'status', 'cancelled', 'cancelled_at', t);
end $$;
grant execute on function public.shop_cancel_order(text, text, text) to anon, authenticated;
