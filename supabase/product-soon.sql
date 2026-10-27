-- Product «Coming Soon» switch: shows the product without a price and blocks ordering it, whatever its price.
-- 1) the column the admin toggle saves to  2) one check in the live shop_place_order. Safe to run twice.
alter table public.shop_products add column if not exists coming_soon boolean not null default false;
do $$ declare d text; m text := $m$if not found then raise exception 'منتج مش متاح دلوقتي'; end if;$m$;
begin
  d := pg_get_functiondef('public.shop_place_order'::regproc);
  if position(m in d) = 0 then raise exception 'anchor missing'; end if;
  if position('Coming Soon، لسه منزلش' in d) = 0 then
    d := replace(d, m, m || E'\n    -- a product the admin switched to Coming Soon can''t be ordered yet\n    if p.coming_soon then raise exception ''% Coming Soon، لسه منزلش'', p.name; end if;');
    execute d;
  end if;
end $$;
notify pgrst, 'reload schema';
