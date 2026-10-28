// DAQQA — offline-friendly cache: pages network-first, styles/scripts/fonts/images cache-first (they are versioned with ?v=)
const V = 'dq-v2';  // pages are always re-checked with the server, so a new version shows on the next open
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (u.pathname.endsWith('/version.json')) return; // always fresh: it tells open pages a new version is out
  if (r.method !== 'GET' || u.hostname.endsWith('supabase.co') && !u.pathname.includes('/storage/v1/object/public/')) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(res => { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); return res; }).catch(() => caches.match(r, { ignoreSearch: false }).then(m => m || caches.match('./'))));
    return;
  }
  const asset = u.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net/.test(u.hostname) || u.pathname.includes('/storage/v1/object/public/');
  if (!asset) return;
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; })));
});

// order notifications for the admin (sent by the order-push function when a new order comes in)
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (er) { d = { title: 'DAQQA', body: e.data ? e.data.text() : '' }; }
  // an open dashboard reloads its orders right away and plays the shop's cash sound, so the notification itself stays silent then
  // (with the dashboard closed it rings with the device's own notification sound — a website can't give it another one)
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).catch(() => []).then(ws => {
    const open = ws.filter(w => w.url.includes('admin.html'));
    open.forEach(w => w.postMessage({ type: 'dq-push', tag: d.tag }));
    return self.registration.showNotification(d.title || 'DAQQA — طلب جديد', { body: d.body || '', tag: d.tag || 'dq', renotify: true, requireInteraction: true, silent: open.length > 0,
      icon: 'assets/icon-512.png', badge: 'assets/icon-512.png', data: { url: d.url || 'admin.html#orders' } });
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || 'admin.html#orders', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const w = ws.find(c => c.url.includes('admin.html'));
    if (w) return w.focus().then(() => w.navigate ? w.navigate(url) : null).catch(() => self.clients.openWindow(url));
    return self.clients.openWindow(url);
  }));
});
