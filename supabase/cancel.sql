-- customers can cancel their own order while it is still "new" or "confirmed" (not after it ships)
create or replace function public.shop_cancel_order(p_code text, p_phone text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o public.shop_orders;
begin
  select * into o from public.shop_orders where code = upper(trim(p_code)) for update;
  if not found or not ((auth.uid() is not null and o.user_id = auth.uid())
     or regexp_replace(o.phone, '\D', '', 'g') = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) then
    raise exception 'الطلب مش موجود';
  end if;
  if o.status = 'cancelled' then return jsonb_build_object('code', o.code, 'status', o.status); end if;
  if o.status not in ('new', 'confirmed') then raise exception 'الطلب خرج للشحن ومينفعش يتلغي دلوقتي، كلمنا على واتساب'; end if;
  update public.shop_orders set status = 'cancelled' where id = o.id;   -- the stock trigger gives the pieces back
  return jsonb_build_object('code', o.code, 'status', 'cancelled');
end $$;
grant execute on function public.shop_cancel_order(text, text) to anon, authenticated;
