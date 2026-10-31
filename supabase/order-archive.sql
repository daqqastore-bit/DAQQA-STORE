-- Orders archive (admin «أرشفة»): archived orders leave the order lists but still count in the accounts.
-- Safe to run twice.
alter table public.shop_orders add column if not exists archived_at timestamptz;
