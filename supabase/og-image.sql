-- link preview image: lets the admin overwrite shop-images/og/share.jpg (upsert needs a SELECT policy)
create policy "shop-images: admin read" on storage.objects for select to authenticated
  using (bucket_id = 'shop-images' and public.shop_is_admin());
