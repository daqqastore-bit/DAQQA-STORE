# DAQQA Watches (دقّة)

Watch store — static site on GitHub Pages, backend on Supabase (project iyxgiukausajvxpkwaaw).

- `supabase/schema.sql` — whole database setup (tables, RLS, order functions, realtime, storage). Admin: daqqastore@gmail.com (table `shop_admins`).

- `index.html` — home: live Q-dial hero, best sellers, offer, collection (filters/sort)
- `product.html?p=<id>-<name>` — dedicated product page (gallery, specs, buy now, share, related, SEO)
- `admin.html` — admin: sales dashboard, live orders, products/images/discounts, settings
- `assets/app.js` — shared header/footer/search/cart/checkout
- `assets/config.js` — Supabase URL + publishable key (data protected by RLS), brand mark
- Product specs: in the admin description, lines written as `Label: value` become the specs table.
