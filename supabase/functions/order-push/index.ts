// DAQQA — sends a phone/desktop notification to every admin device that switched notifications on.
// Called by the database (trigger on shop_orders / low stock on shop_products, shop_push_test(), or the «نوتفكشن وهمية» queue) with the hook secret; keys live in shop_push_conf (service role only).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const money = (n: number) => Math.round(Number(n) || 0).toLocaleString("en-US") + " ج.م";

// Telegram (optional): secret TELEGRAM_TOKEN = the bot's token. A phone joins by sending the bot the pairing code
// (dq + first 6 hex of sha256(token)); its chat is kept in shop_push_subs as endpoint "tg:<chat id>".
// Each chat can get its own tone in Telegram (chat → Notifications → Sound), so orders ring with the shop's sound even with the admin closed.
const TG = Deno.env.get("TELEGRAM_TOKEN") || "";
const tgApi = (m: string, body: unknown) => fetch(`https://api.telegram.org/bot${TG}/${m}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch(() => ({}));
async function tgCode() { const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(TG))); return "dq" + [...h.slice(0, 3)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
async function tgPair(sb: any) {
  const code = await tgCode(), up = await tgApi("getUpdates", { timeout: 0, allowed_updates: ["message"] }); let last = 0;
  for (const u of up.result || []) { last = Math.max(last, u.update_id); const m = u.message; if (!m || !m.chat || m.chat.type !== "private") continue;
    const ep = "tg:" + m.chat.id, txt = String(m.text || "").toLowerCase();
    if (txt.includes(code)) { await sb.from("shop_push_subs").upsert({ endpoint: ep, p256dh: "-", auth: "-", device: "Telegram · " + (m.chat.first_name || m.chat.username || m.chat.id) });
      await tgApi("sendMessage", { chat_id: m.chat.id, text: "✓ اتربطت. أي طلب جديد هيوصلك هنا.\nعشان يرن بصوت الكاش: افتح الشات ده ← اسم البوت فوق ← Notifications ← Sound واختار الصوت." }); }
    else if (txt.startsWith("/stop")) await sb.from("shop_push_subs").delete().eq("endpoint", ep);
    else if (txt.startsWith("/start")) await tgApi("sendMessage", { chat_id: m.chat.id, text: "ابعت كود الربط عشان توصلك الطلبات هنا." }); }
  if (last) await tgApi("getUpdates", { offset: last + 1, timeout: 0 });   // mark them read
}

Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: conf } = await sb.from("shop_push_conf").select("*").eq("id", 1).single();
  if (!conf || req.headers.get("x-hook") !== conf.hook_secret) return new Response("unauthorized", { status: 401 });
  const { id, test, low, fake } = await req.json().catch(() => ({}));

  let msg: Record<string, string>;
  // fake order alert (Admin → «نوتفكشن وهمية», queued in private.shop_fake_queue): shown like a real order, nothing is looked up
  if (fake && fake.title) msg = { title: String(fake.title), body: String(fake.body || ""), url: "admin.html#orders", tag: String(fake.tag || "dq-fake") };
  else if (test) msg = { title: "DAQQA — الإشعارات شغالة ✓", body: "أول ما يجيلك طلب جديد هيوصلك إشعار زي ده.", url: "admin.html#orders", tag: "dq-test" };
  else if (low) {
    const { data: p } = await sb.from("shop_products").select("name, stock").eq("id", low).single();
    if (!p) return new Response("no product", { status: 404 });
    // one short line: how many are left of which product
    msg = { title: p.stock === 0 ? `خلص ${p.name} من المخزون` : `فاضل ${p.stock} من ${p.name} في المخزون`, body: "", url: "admin.html#overview", tag: "dq-low-" + low };
  } else {
    const { data: o } = await sb.from("shop_orders").select("code, customer_name, city, total, shop_order_items(name, qty, options)").eq("id", id).single();
    if (!o) return new Response("no order", { status: 404 });
    const items = (o.shop_order_items || []).map((i: any) => `${i.name}${(i.options || []).length ? ` (${i.options.map((x: any) => x.v).join("، ")})` : ""} × ${i.qty}`).join(" · ");
    msg = { title: `طلب جديد ${o.code} — ${money(o.total)}`, body: `${o.customer_name || ""}${o.city ? " · " + o.city : ""}\n${items}`, url: "admin.html#orders/" + encodeURIComponent(o.code), tag: o.code };
  }

  let tg: string[] = [];
  if (TG) { await tgPair(sb);
    const { data: chats } = await sb.from("shop_push_subs").select("endpoint").like("endpoint", "tg:%");
    tg = await Promise.all((chats || []).map((c: any) => tgApi("sendMessage", { chat_id: c.endpoint.slice(3), text: msg.title + (msg.body ? "\n" + msg.body : "") })
      .then((r: any) => c.endpoint + (r.ok ? " ok" : " ERR " + r.description)))); }

  webpush.setVapidDetails("mailto:daqqastore@gmail.com", conf.vapid_public, conf.vapid_private);
  // a fake run goes to every device, like a real order (an endpoint, if given, limits it to that one device)
  let q = sb.from("shop_push_subs").select("endpoint, p256dh, auth"); if (fake && fake.endpoint) q = q.eq("endpoint", String(fake.endpoint));
  const { data: subs0 } = await q, subs = (subs0 || []).filter((s: any) => !s.endpoint.startsWith("tg:"));
  const sent = await Promise.all((subs || []).map((s: any) =>
    webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 86400, urgency: "high" })
      .then((r: any) => s.endpoint.slice(8, 30) + " " + r.statusCode)
      .catch(async (e: any) => { console.log("push fail", s.endpoint.slice(8, 40), e.statusCode, e.body || e.message); if (e.statusCode === 404 || e.statusCode === 410) await sb.from("shop_push_subs").delete().eq("endpoint", s.endpoint); return s.endpoint.slice(8, 30) + " ERR " + String(e.statusCode || e.message); })));
  console.log("push sent", JSON.stringify(sent), JSON.stringify(tg));
  return Response.json({ sent, tg });
});
