// DAQQA — sends a phone/desktop notification to every admin device that switched notifications on.
// Called by the database (trigger on shop_orders, or shop_push_test()) with the hook secret; keys live in shop_push_conf (service role only).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const money = (n: number) => Math.round(Number(n) || 0).toLocaleString("en-US") + " ج.م";

Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: conf } = await sb.from("shop_push_conf").select("*").eq("id", 1).single();
  if (!conf || req.headers.get("x-hook") !== conf.hook_secret) return new Response("unauthorized", { status: 401 });
  const { id, test } = await req.json().catch(() => ({}));

  let msg: Record<string, string>;
  if (test) msg = { title: "DAQQA — الإشعارات شغالة ✓", body: "أول ما يجيلك طلب جديد هيوصلك إشعار زي ده.", url: "admin.html#orders", tag: "dq-test" };
  else {
    const { data: o } = await sb.from("shop_orders").select("code, customer_name, city, total, shop_order_items(name, qty, options)").eq("id", id).single();
    if (!o) return new Response("no order", { status: 404 });
    const items = (o.shop_order_items || []).map((i: any) => `${i.name}${(i.options || []).length ? ` (${i.options.map((x: any) => x.v).join("، ")})` : ""} × ${i.qty}`).join(" · ");
    msg = { title: `طلب جديد ${o.code} — ${money(o.total)}`, body: `${o.customer_name || ""}${o.city ? " · " + o.city : ""}\n${items}`, url: "admin.html#orders/" + encodeURIComponent(o.code), tag: o.code };
  }

  webpush.setVapidDetails("mailto:daqqastore@gmail.com", conf.vapid_public, conf.vapid_private);
  const { data: subs } = await sb.from("shop_push_subs").select("endpoint, p256dh, auth");
  const sent = await Promise.all((subs || []).map((s: any) =>
    webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 86400, urgency: "high" })
      .then(() => "ok")
      .catch(async (e: any) => { if (e.statusCode === 404 || e.statusCode === 410) await sb.from("shop_push_subs").delete().eq("endpoint", s.endpoint); return String(e.statusCode || e.message); })));
  return Response.json({ sent });
});
