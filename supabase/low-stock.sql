-- Low-stock alert: every time a product's stock goes DOWN and is 10 or fewer (or runs out), the admin devices get
-- «فاضل N من … في المخزون». Before, it only fired once when stock crossed from above 10. Safe to run twice.
create or replace function private.shop_push_on_low() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.stock is not null and new.stock <= 10 and (old.stock is null or new.stock < old.stock) then
    begin perform private.shop_push_send(jsonb_build_object('low', new.id)); exception when others then null; end;
  end if;
  return new;
end $$;
