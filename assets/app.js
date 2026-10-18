// DAQQA Watches — shared storefront logic (header, footer, search, cart, checkout)
(function () {
  const { money, finalPrice, discountPct, esc, categories } = RC;
  // sessions are kept so a signed-in customer stays signed in and their orders are linked to them
  const sb = supabase.createClient(RC.url, RC.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const $ = (s, r = document) => r.querySelector(s);
  const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#20160E"/><circle cx="200" cy="200" r="84" fill="none" stroke="#4A3828" stroke-width="10"/><path d="M200 200V140M200 200L250 250" stroke="#4A3828" stroke-width="8" stroke-linecap="round"/></svg>');
  const ICON = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4.1-5.4 7.5-5.4s6.3 1.8 7.5 5.4"/></svg>',
    google: '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M10 17h10"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    gem: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M9 6h14l5 7-12 14L4 13z"/><path d="M4 13h24M12 6l-3 7 7 14 7-14-3-7"/></svg>',
    gear: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="16" cy="16" r="4.5"/><path d="M16 4v4M16 24v4M4 16h4M24 16h4M7.5 7.5l2.8 2.8M21.7 21.7l2.8 2.8M7.5 24.5l2.8-2.8M21.7 10.3l2.8-2.8"/></svg>',
    shield: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M16 4l10 4v8c0 6-4.5 10-10 12-5.5-2-10-6-10-12V8z"/><path d="M11.5 16l3 3 6-6"/></svg>',
    truck: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M3 9h16v12H3zM19 13h6l4 5v3H19"/><circle cx="9" cy="23" r="2.5"/><circle cx="23" cy="23" r="2.5"/></svg>',
    sun: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="16" cy="16" r="5.5"/><path d="M16 3v4M16 25v4M3 16h4M25 16h4M6.8 6.8l2.8 2.8M22.4 22.4l2.8 2.8M6.8 25.2l2.8-2.8M22.4 9.6l2.8-2.8"/></svg>',
    leaf: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M26 5C12 5 6 12 6 20c0 3 1 5 2 7 9 0 18-6 18-22z"/><path d="M8 27c4-8 9-12 13-15"/></svg>',
    eye: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M3 16s5-8 13-8 13 8 13 8-5 8-13 8S3 16 3 16z"/><circle cx="16" cy="16" r="4"/></svg>',
    link: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M13 19l6-6M11 15l-3 3a4.2 4.2 0 0 0 6 6l3-3M21 17l3-3a4.2 4.2 0 0 0-6-6l-3 3"/></svg>',
    gift: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M5 12h22v5H5zM7 17h18v11H7zM16 12v16"/><path d="M16 12c-2-5-8-6-8-2 0 2 4 2 8 2zM16 12c2-5 8-6 8-2 0 2-4 2-8 2z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20.5 13.6A8.5 8.5 0 1 1 10.4 3.5a6.7 6.7 0 0 0 10.1 10.1z"/></svg>',
    star: '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><path d="M16 4l3.6 7.6 8.4 1-6.2 5.8 1.6 8.3L16 22.6l-7.4 4.1 1.6-8.3L4 12.6l8.4-1z"/></svg>'
  };
  const GOV = ['القاهرة','الجيزة','القليوبية','الإسكندرية','الشرقية','الدقهلية','الغربية','المنوفية','البحيرة','كفر الشيخ','دمياط','بورسعيد','الإسماعيلية','السويس','الفيوم','بني سويف','المنيا','أسيوط','سوهاج','قنا','الأقصر','أسوان','البحر الأحمر','مطروح','شمال سيناء','جنوب سيناء','الوادي الجديد'];

  const DQ = window.DQ = { sb, FALLBACK, ICON, products: [], settings: {}, cart: [] };
  try { DQ.cart = JSON.parse(localStorage.getItem('dq-cart') || localStorage.getItem('rc-cart') || '[]') } catch (e) {}

  /* ---------- small helpers ---------- */
  DQ.toast = (msg, type = '') => { const t = document.createElement('div'); t.className = 'toast ' + type; t.textContent = msg; $('#toasts').appendChild(t); setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = 0; setTimeout(() => t.remove(), 300) }, 2800); };
  // scroll reveals: measured with getBoundingClientRect (an IntersectionObserver never fires for clip-path:inset(..) elements, which have zero visible area until they open)
  let pending = [], checkQueued = false;
  function check() {
    checkQueued = false; const vh = innerHeight;
    pending = pending.filter(el => {
      if (!el.isConnected) return false;
      const r = el.getBoundingClientRect();
      if (r.top < vh * .9 && r.bottom > 0) { el.classList.add('in'); if (el.classList.contains('op-zoom')) setTimeout(() => el.classList.add('settled'), 2000); return false; }
      return true;
    });
  }
  const queueCheck = () => { if (!checkQueued) { checkQueued = true; requestAnimationFrame(check); } };
  addEventListener('scroll', queueCheck, { passive: true }); addEventListener('resize', queueCheck);
  DQ.reveal = () => { document.querySelectorAll('.reveal:not(.in), .op:not(.in)').forEach(el => { if (!pending.includes(el)) pending.push(el); }); queueCheck(); };
  // gentle parallax for section backgrounds (data-parallax) — one rAF per frame, skipped for reduced motion
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let ticking = false;
    addEventListener('scroll', () => { if (ticking) return; ticking = true; requestAnimationFrame(() => {
      ticking = false; const vh = innerHeight;
      document.querySelectorAll('[data-parallax].in').forEach(el => { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > vh) return;
        const t = (r.top + r.height / 2 - vh / 2) / vh; el.style.setProperty('--py', (t * -60).toFixed(1) + 'px'); });
    }); }, { passive: true });
  }
  DQ.priceHTML = (p) => { const off = discountPct(p); return `<div class="prices"><span class="price-new">${money(finalPrice(p))}</span>${off ? `<span class="price-old">${money(p.price)}</span>` : ''}</div>`; };
  DQ.img = (p, i = 0) => esc((p.images && p.images[i]) || FALLBACK);
  DQ.favs = new Set(); try { DQ.favs = new Set(JSON.parse(localStorage.getItem('dq-favs') || '[]')) } catch (e) {}
  function renderFavs() {
    $('#favCount').textContent = DQ.favs.size; $('#favCount').classList.toggle('show', DQ.favs.size > 0);
    const list = DQ.products.filter(p => DQ.favs.has(p.id));
    $('#favRes').innerHTML = list.length ? list.map(p => `<a href="${RC.productUrl(p)}"><img src="${DQ.img(p)}" alt="" onerror="this.src='${FALLBACK}'"><span><b class="en">${esc(p.name)}</b><br><small>${RC.kinds[RC.kindOf(p)].ar}</small></span>${DQ.priceHTML(p)}</a>`).join('') : `<div class="empty">لسه مفيش حاجة في المفضلة. دوس على القلب في أي منتج.</div>`;
    document.querySelectorAll('[data-fav]').forEach(b => { const on = DQ.favs.has(+b.dataset.fav); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  }
  DQ.toggleFav = id => { DQ.favs.has(id) ? DQ.favs.delete(id) : DQ.favs.add(id); try { localStorage.setItem('dq-favs', JSON.stringify([...DQ.favs])) } catch (e) {} renderFavs(); DQ.toast(DQ.favs.has(id) ? 'اتضافت للمفضلة' : 'اتشالت من المفضلة'); };
  DQ.renderFavs = renderFavs;
  DQ.card = (p, i = 0) => {
    const off = discountPct(p), url = RC.productUrl(p), cols = RC.colors(p), fav = DQ.favs && DQ.favs.has(p.id);
    const nImg = (p.images || []).length;
    return `<article class="card reveal" data-pid="${p.id}" style="transition-delay:${Math.min(i, 8) * 50}ms">
      <a class="ph" href="${url}" tabindex="-1" aria-hidden="true"><img loading="lazy" src="${DQ.img(p)}" alt="" onerror="this.src='${FALLBACK}'">${p.images && p.images[1] ? `<img class="alt" loading="lazy" src="${DQ.img(p, 1)}" alt="">` : ''}
        ${nImg > 1 ? `<span class="ph-dots" aria-hidden="true">${'<i></i>'.repeat(Math.min(nImg, 6))}</span>` : ''}${off ? `<span class="badge-off">-${off}%</span>` : ''}${p.stock <= 0 ? `<div class="out">نفدت الكمية</div>` : ''}</a>
      <button class="fav ${fav ? 'on' : ''}" data-fav="${p.id}" aria-pressed="${fav}" aria-label="أضف ${esc(p.name)} للمفضلة">${ICON.heart}</button>
      <div class="bd"><h3 class="en"><a href="${url}">${esc(p.name)}</a></h3>
        <span class="sku en">${RC.sku(p)}${p.style ? ' · ' + esc(p.style) : ''}</span>
        <div class="row">${DQ.priceHTML(p)}${p.stock > 0 ? `<button class="add" data-add="${p.id}" aria-label="أضف ${esc(p.name)} للسلة">${ICON.plus}</button>` : ''}</div>
        ${cols.length ? `<div class="sw">${cols.map(c => `<i style="background:${c}" title="${c.toUpperCase()}"></i>`).join('')}</div>` : ''}
      </div></article>`;
  };
  DQ.wa = () => (DQ.settings.whatsapp || '').replace(/\D/g, '');

  /* ---------- hover: a product with several photos flips through them ---------- */
  function imageFlip() {
    if (!matchMedia('(hover: hover)').matches) return;
    let cur = null, timer = null;
    const stop = () => { if (!cur) return; clearInterval(timer); const c = cur; cur = null; c.classList.remove('flipping'); const img = c.querySelector('.ph img:not(.alt)'), p = DQ.byId(+c.dataset.pid);
      if (img && p) img.src = DQ.img(p, 0); c.querySelectorAll('.ph-dots i').forEach((d, j) => d.classList.toggle('on', j === 0)); };
    document.addEventListener('pointerover', e => {
      const c = e.target.closest && e.target.closest('[data-pid]');
      if (c === cur) return; stop();
      const p = c && DQ.byId(+c.dataset.pid); if (!p || !p.images || p.images.length < 2) return;
      cur = c; c.classList.add('flipping'); let i = 0; const img = c.querySelector('.ph img:not(.alt), [data-flip]'), dots = c.querySelectorAll('.ph-dots i');
      p.images.slice(1).forEach(u => { const im = new Image(); im.src = u; });
      const step = () => { i = (i + 1) % p.images.length; img.classList.add('swap'); setTimeout(() => { img.src = DQ.img(p, i); img.classList.remove('swap'); }, 180); dots.forEach((d, j) => d.classList.toggle('on', j === i % dots.length)); };
      dots.forEach((d, j) => d.classList.toggle('on', j === 0));
      setTimeout(() => cur === c && step(), 350); timer = setInterval(step, 1100);
    });
  }

  /* ---------- pages menu (Luxury / Men / Women) ---------- */
  function pagesMenu(active) {
    const on = RC.pages[active] ? 'on' : '';
    return `<div class="pg-menu" data-pages><button type="button" class="pg-btn ${on}" aria-haspopup="true" aria-expanded="false">الصفحات <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
      <div class="pg-drop" role="menu">${Object.entries(RC.pages).filter(([k]) => k !== 'luxury').map(([k, v]) => `<a role="menuitem" href="${v.href}" data-page="${k}" class="${k === 'luxury' ? 'lux' : ''} ${k === active ? 'on' : ''}"><b>${v.ar}</b><small class="en">${k === 'luxury' ? 'DAQQA PRIVÉ' : v.en.toUpperCase()}</small></a>`).join('')}</div></div>`;
  }
  DQ.livePages = () => Object.keys(RC.pages).filter(k => DQ.products.some(p => RC.pages[k].test(p) && p.images && p.images.length));
  DQ.pageItems = k => DQ.products.filter(p => RC.pages[k].test(p) && p.images && p.images.length);

  /* ---------- chrome: header, sheets, footer, drawer ---------- */
  function chrome(active) {
    const nav = [['./', 'الرئيسية', 'home'], ['./#watches', 'الساعات', 'watches'], ['./#glasses', 'النضارات', 'glasses'], ['./#accessories', 'الاكسسوارات', 'accessories']];
    $('#hdr').innerHTML = `
      <header class="nav-bar"><div class="wrap nav">
        <a href="./" class="brand" aria-label="DAQQA — الرئيسية"><span class="m">${RC.logo()}</span><span class="wm"><b>DAQQA</b></span></a>
        <nav class="links" aria-label="القائمة">${nav.map(([h, l, k]) => `<a href="${h}" data-kind="${k}" class="${k === active ? 'on' : ''}">${l}</a>`).join('')}${pagesMenu(active)}</nav>
        <a href="luxury.html" class="lux-btn ${active === 'luxury' ? 'on' : ''}" data-page="luxury" aria-label="DAQQA Privé — Luxury"><i aria-hidden="true"></i><span class="en">LUXURY</span></a>
        <div class="actions">
          <button class="icon-btn theme-btn" id="themeBtn" aria-label="تغيير الوضع"><span class="i-sun">${ICON.sun}</span><span class="i-moon">${ICON.moon}</span></button>
          <button class="icon-btn" id="searchBtn" aria-label="بحث">${ICON.search}</button>
          <button class="icon-btn" id="favBtn" aria-label="المفضلة">${ICON.heart}<span class="cart-count" id="favCount">0</span></button>
          <button class="icon-btn" id="accBtn" aria-label="حسابي">${ICON.user}<span class="acc-dot" id="accDot"></span></button>
          <button class="icon-btn" id="cartBtn" aria-label="السلة">${ICON.bag}<span class="cart-count" id="cartCount">0</span></button>
          <button class="icon-btn menu-btn" id="menuBtn" aria-label="القائمة">${ICON.menu}</button>
        </div></div></header>
      <div class="sheet" id="menuSheet" role="dialog" aria-label="القائمة"><div class="wrap sheet-head"><a href="./" class="brand"><span class="m">${RC.logo()}</span><span class="wm"><b>DAQQA</b></span></a><button class="icon-btn" data-close aria-label="إغلاق">${ICON.close}</button></div>
        <div class="wrap sheet-body"><a href="luxury.html" class="lux-row" data-page="luxury" data-close><span class="en">LUXURY</span><small class="en">DAQQA PRIVÉ COLLECTION</small></a><nav class="menu-list">${nav.map(([h, l, k]) => `<a href="${h}" data-kind="${k}" data-close>${l}<span class="en">${RC.kinds[k] ? RC.kinds[k].en.toUpperCase() : '→'}</span></a>`).join('')}<div class="menu-pages" data-pages><small class="en">PAGES</small>${Object.entries(RC.pages).filter(([k]) => k !== 'luxury').map(([k, v]) => `<a href="${v.href}" data-page="${k}" class="${k === 'luxury' ? 'lux' : ''}" data-close>${v.ar}<span class="en">${v.en.toUpperCase()}</span></a>`).join('')}</div><div class="menu-tools"><button type="button" id="mFav">${ICON.heart}<span>المفضلة</span></button><button type="button" id="mTheme"><span class="i-sun">${ICON.sun}</span><span class="i-moon">${ICON.moon}</span><span>تغيير الوضع</span></button><button type="button" id="mSearch">${ICON.search}<span>بحث</span></button><button type="button" id="mAcc">${ICON.user}<span>حسابي</span></button></div></nav></div></div>
      <div class="sheet" id="favSheet" role="dialog" aria-label="المفضلة"><div class="wrap sheet-head"><b style="font-size:18px">المفضلة</b><button class="icon-btn" data-close aria-label="إغلاق">${ICON.close}</button></div><div class="wrap sheet-body"><div class="search-res" id="favRes"></div></div></div>
      <div class="sheet" id="accSheet" role="dialog" aria-label="حسابي"><div class="wrap sheet-head"><b style="font-size:18px" id="accTitle">حسابي</b><button class="icon-btn" data-close aria-label="إغلاق">${ICON.close}</button></div><div class="wrap sheet-body"><div class="acc" id="accBody"></div></div></div>
      <div class="sheet" id="searchSheet" role="dialog" aria-label="بحث"><div class="wrap sheet-head"><b style="font-size:18px">بحث</b><button class="icon-btn" data-close aria-label="إغلاق">${ICON.close}</button></div>
        <div class="wrap sheet-body"><input class="input search-input" id="searchInput" placeholder="دوّر على ساعة، نضارة أو اكسسوار…" autocomplete="off"><div class="search-res" id="searchRes"></div></div></div>`;
    $('#ftr').innerHTML = `<footer class="site-foot"><div class="wrap">
      <div class="foot-grid">
        <div class="foot-brand"><a href="./" class="brand"><span class="m">${RC.logo()}</span><span class="wm"><b>DAQQA</b></span></a>
          <p>دقّة — ساعات ونضارات واكسسوارات مختارة بعناية، بأسعار واضحة وعروض حقيقية. الدفع عند الاستلام والشحن لكل مصر.</p></div>
        <div><h4 class="en">SHOP</h4><ul>${Object.entries(RC.kinds).map(([k, v]) => `<li data-kind="${k}"><a href="./#${k}">${v.ar}</a></li>`).join('')}</ul></div>
        <div><h4 class="en">HELP</h4><ul><li>الدفع عند الاستلام</li><li>شحن 2–5 أيام</li><li>استبدال خلال 14 يوم</li><li>ضمان على الماكينة</li></ul></div>
        <div><h4 class="en">CONTACT</h4><ul id="ftContact"><li>واتساب: <span class="en" id="ftWa">—</span></li><li><a href="https://www.instagram.com/" target="_blank" rel="noopener">Instagram</a></li><li><a href="https://www.tiktok.com/" target="_blank" rel="noopener">TikTok</a></li></ul></div>
      </div>
      <div class="foot-bottom"><span class="en">© ${new Date().getFullYear()} DAQQA</span><span class="foot-motto">دقّت ساعة العمل.</span></div></div></footer>
      <div class="overlay" id="overlay"></div>
      <aside class="drawer" id="drawer" aria-label="السلة"><div class="dr-head"><h3 id="drTitle">السلة</h3><button class="icon-btn" data-close aria-label="إغلاق">${ICON.close}</button></div><div class="dr-body" id="drBody"></div><div class="dr-foot" id="drFoot"></div></aside>
      <div class="toast-wrap" id="toasts"></div>`;

    $('#cartBtn').onclick = () => DQ.openCart('cart');
    $('#accBtn').onclick = () => DQ.openAccount();
    $('#menuBtn').onclick = () => openSheet('#menuSheet');
    $('#themeBtn').onclick = toggleTheme;
    $('#mTheme').onclick = e => toggleTheme(e); $('#mFav').onclick = () => { renderFavs(); openSheet('#favSheet'); }; $('#mAcc').onclick = () => DQ.openAccount(); $('#mSearch').onclick = () => { openSheet('#searchSheet'); setTimeout(() => $('#searchInput').focus(), 80); };
    $('#favBtn').onclick = () => { renderFavs(); openSheet('#favSheet'); };
    $('#searchBtn').onclick = () => { openSheet('#searchSheet'); setTimeout(() => $('#searchInput').focus(), 80); };
    $('#searchInput').oninput = e => renderSearch(e.target.value);
    $('#overlay').onclick = DQ.closeAll;
    const pm = document.querySelector('.links .pg-menu');
    if (pm) { const b = pm.querySelector('.pg-btn'); const set = v => { pm.classList.toggle('open', v); b.setAttribute('aria-expanded', v); };
      b.onclick = e => { e.stopPropagation(); set(!pm.classList.contains('open')); };
      pm.onmouseenter = () => matchMedia('(hover: hover)').matches && set(true); pm.onmouseleave = () => set(false);
      document.addEventListener('click', e => { if (!pm.contains(e.target)) set(false); }); }
    imageFlip();
    document.addEventListener('click', e => {
      if (e.target.closest('[data-close]')) DQ.closeAll();
      const add = e.target.closest('[data-add]');
      if (add) { e.preventDefault(); pop(add); DQ.addToCart(+add.dataset.add, 1); }
      const fv = e.target.closest('[data-fav]');
      if (fv) { e.preventDefault(); pop(fv); DQ.toggleFav(+fv.dataset.fav); }
    });
    addEventListener('keydown', e => { if (e.key === 'Escape') DQ.closeAll(); });
    $('#drBody').addEventListener('click', e => {
      const q = e.target.closest('[data-q]'), rm = e.target.closest('[data-rm]');
      if (q) { const l = DQ.cart.find(c => c.id === +q.dataset.q), p = DQ.byId(l.id); l.qty = Math.max(1, Math.min(p.stock, 20, l.qty + +q.dataset.d)); saveCart(); renderCart(); }
      if (rm) { DQ.cart = DQ.cart.filter(c => c.id !== +rm.dataset.rm); saveCart(); renderCart(); }
    });
  }
  function pop(el) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  /* ---------- light / dark with a circular "pop" from the button ---------- */
  function toggleTheme(e) {
    const html = document.documentElement, next = html.dataset.theme === 'light' ? 'dark' : 'light';
    const r = e.currentTarget.getBoundingClientRect();
    html.style.setProperty('--vt-x', (r.left + r.width / 2) + 'px'); html.style.setProperty('--vt-y', (r.top + r.height / 2) + 'px');
    pop(e.currentTarget);
    const apply = () => { html.dataset.theme = next; try { localStorage.setItem('dq-theme', next) } catch (er) {} document.querySelector('meta[name=theme-color]')?.setAttribute('content', next === 'light' ? '#EFE6D8' : '#20160E'); };
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) { html.classList.add('vt-theme'); document.startViewTransition(apply).finished.finally(() => html.classList.remove('vt-theme')); } else apply();
  }
  /* ---------- page transitions fallback (browsers without cross-document view transitions) ---------- */
  if (!('onpagereveal' in window) && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('pg-fx');
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
      const u = new URL(a.href, location.href); if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
      e.preventDefault(); document.documentElement.classList.add('pg-leave'); setTimeout(() => { location.href = u.href; }, 280);
    });
    addEventListener('pageshow', e => { if (e.persisted) document.documentElement.classList.remove('pg-leave'); });
  }
  /* ---------- intro: the Q dial winds up, then the doors open (once per visit) ---------- */
  function intro() {
    if (window.DQ_NO_INTRO) return;
    let seen = false; try { seen = sessionStorage.getItem('dq-intro') === '1'; sessionStorage.setItem('dq-intro', '1'); } catch (e) {}
    if (window.DQ_NO_INTRO || seen || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = document.createElement('div'); el.className = 'intro'; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = `<div class="door l"></div><div class="door r"></div><div class="intro-c"><div class="m">${RC.dial()}</div><b>DAQQA</b></div>`;
    document.body.appendChild(el); document.documentElement.classList.add('intro-on');
    const done = () => { el.classList.add('open'); document.documentElement.classList.remove('intro-on'); setTimeout(() => el.remove(), 1300); };
    el.addEventListener('click', done, { once: true });
    setTimeout(done, 1700);
  }
  /* ---------- mouse: trailing ring + card tilt (fine pointers only) ---------- */
  function mouseFx() {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.documentElement.classList.add('fx');
    const ring = document.createElement('div'); ring.className = 'cursor-ring'; ring.setAttribute('aria-hidden', 'true'); ring.innerHTML = '<span>عرض</span>';
    const dot = document.createElement('div'); dot.className = 'cursor-dot'; dot.setAttribute('aria-hidden', 'true');
    document.body.append(ring, dot);
    let x = -200, y = -200, rx = x, ry = y, glowEl = null, magEl = null;
    const MAG = '.btn, .btn-line, .icon-btn, .add, .fav, .chip, .view-all';
    addEventListener('pointermove', e => {
      x = e.clientX; y = e.clientY; ring.classList.add('on'); dot.classList.add('on');
      const t = e.target.closest ? e.target : document.body;
      const card = t.closest('.card'), act = t.closest('a, button, select, [role=tab], label'), txt = t.closest('input, textarea');
      ring.classList.toggle('view', !!card && !t.closest('.add, .fav'));
      ring.classList.toggle('big', !card && !!act || (!!card && !!t.closest('.add, .fav')));
      ring.classList.toggle('txt', !!txt);
      // light that follows the mouse across each section background
      const g = t.closest('[data-glow]');
      if (glowEl && glowEl !== g) glowEl.classList.remove('glowing');
      if (g) { const r = g.getBoundingClientRect(); g.style.setProperty('--gx', ((x - r.left) / r.width * 100) + '%'); g.style.setProperty('--gy', ((y - r.top) / r.height * 100) + '%'); g.classList.add('glowing'); }
      glowEl = g;
      // magnetic buttons
      const m = t.closest(MAG);
      if (magEl && magEl !== m) { magEl.style.translate = ''; magEl.classList.remove('mag'); }
      if (m) { const r = m.getBoundingClientRect(); m.classList.add('mag'); m.style.translate = `${((x - r.left) / r.width - .5) * 10}px ${((y - r.top) / r.height - .5) * 8}px`; }
      magEl = m;
      // card tilt + glare
      document.querySelectorAll('.card.tilting').forEach(o => { if (o !== card) { o.classList.remove('tilting'); o.style.transform = ''; } });
      if (card && card.classList.contains('in')) {
        const r = card.getBoundingClientRect(), px = (x - r.left) / r.width - .5, py = (y - r.top) / r.height - .5;
        card.classList.add('tilting'); card.style.transform = `perspective(900px) rotateX(${(-py * 9).toFixed(2)}deg) rotateY(${(px * 11).toFixed(2)}deg) translateY(-10px) scale(1.03)`;
        card.style.setProperty('--gx', (px + .5) * 100 + '%'); card.style.setProperty('--gy', (py + .5) * 100 + '%');
      }
    }, { passive: true });
    document.addEventListener('pointerleave', () => { ring.classList.remove('on'); dot.classList.remove('on'); });
    document.addEventListener('pointerdown', () => ring.classList.add('press')); document.addEventListener('pointerup', () => ring.classList.remove('press'));
    // big screens zoom the page (html{zoom}); mouse coords are screen px, so convert to CSS px or the ring drifts away from the pointer
    let Z = 1; const zoomNow = () => { Z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1; }; zoomNow(); addEventListener('resize', zoomNow);
    (function loop() { rx += (x - rx) * .18; ry += (y - ry) * .18; ring.style.transform = `translate(${rx / Z}px, ${ry / Z}px)`; dot.style.transform = `translate(${x / Z}px, ${y / Z}px)`; requestAnimationFrame(loop); })();
  }
  function openSheet(id) { DQ.closeAll(); $(id).classList.add('on'); document.body.style.overflow = 'hidden'; }
  function renderSearch(q) {
    q = q.trim().toLowerCase();
    const list = q ? DQ.products.filter(p => (p.name + ' ' + (p.brand || '') + ' ' + (categories[p.category] || '') + ' ' + RC.kinds[RC.kindOf(p)].ar + ' ' + RC.kinds[RC.kindOf(p)].en + ' ' + (p.description || '')).toLowerCase().includes(q)) : DQ.products.slice(0, 6);
    $('#searchRes').innerHTML = list.length ? list.slice(0, 12).map(p => `<a href="${RC.productUrl(p)}"><img src="${DQ.img(p)}" alt="" onerror="this.src='${FALLBACK}'"><span><b class="en">${esc(p.name)}</b><br><small>${RC.kinds[RC.kindOf(p)].ar} · ${esc(categories[p.category] || '')}</small></span>${DQ.priceHTML(p)}</a>`).join('') : `<div class="empty">مفيش منتج بالاسم ده.</div>`;
  }

  /* ---------- data ---------- */
  DQ.byId = id => DQ.products.find(p => p.id === id);
  DQ.liveKinds = () => Object.keys(RC.kinds).filter(k => DQ.products.some(p => RC.kindOf(p) === k && !RC.isLuxury(p) && p.images && p.images.length));
  function syncKinds() { const live = DQ.liveKinds(); document.querySelectorAll('[data-kind]').forEach(el => { if (RC.kinds[el.dataset.kind]) el.hidden = !live.includes(el.dataset.kind); });
    const lp = DQ.livePages(); document.querySelectorAll('[data-page]').forEach(el => { el.hidden = !lp.includes(el.dataset.page); }); document.querySelectorAll('[data-pages]').forEach(el => { el.hidden = !lp.length; }); }
  DQ.load = async () => {
    const [p, s] = await Promise.all([
      sb.from('shop_products').select('*').eq('active', true).order('sort').order('id'),
      sb.from('shop_settings').select('*').eq('id', 1).maybeSingle()
    ]);
    if (p.error) throw p.error;
    DQ.products = p.data || []; DQ.settings = s.data || {};

    if (DQ.wa()) $('#ftWa').innerHTML = `<a href="https://wa.me/${DQ.wa()}" target="_blank" rel="noopener">${esc(DQ.settings.whatsapp)}</a>`;
    renderCart(); renderSearch(''); syncKinds(); renderFavs();
  };

  /* ---------- cart ---------- */
  let view = 'cart';
  function saveCart() { try { localStorage.setItem('dq-cart', JSON.stringify(DQ.cart)) } catch (e) {} }
  const lines = () => DQ.cart.map(c => ({ ...c, p: DQ.byId(c.id) })).filter(c => c.p);
  DQ.addToCart = (id, qty, silent) => {
    const p = DQ.byId(id); if (!p || p.stock <= 0) return;
    const line = DQ.cart.find(c => c.id === id);
    const next = Math.min((line ? line.qty : 0) + qty, p.stock, 20);
    if (line) line.qty = next; else DQ.cart.push({ id, qty: next });
    saveCart(); renderCart();
    const b = $('#cartBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
    if (!silent) DQ.toast('اتضافت للسلة ✓', 'ok');
  };
  function totals() {
    const ls = lines();
    const sub = ls.reduce((s, l) => s + finalPrice(l.p) * l.qty, 0);
    const orig = ls.reduce((s, l) => s + Number(l.p.price) * l.qty, 0);
    const fso = DQ.settings.free_shipping_over != null ? Number(DQ.settings.free_shipping_over) : null;
    const ship = !ls.length ? 0 : (fso != null && sub >= fso ? 0 : Number(DQ.settings.shipping_fee || 0));
    return { ls, sub, save: orig - sub, ship, total: sub + ship, fso };
  }
  function renderCart() {
    if (DQ.products.length) DQ.cart = DQ.cart.filter(c => DQ.products.some(p => p.id === c.id && p.stock > 0));
    const n = DQ.cart.reduce((s, c) => s + c.qty, 0);
    $('#cartCount').textContent = n; $('#cartCount').classList.toggle('show', n > 0);
    if (view === 'done') return;
    const t = totals();
    if (!t.ls.length) {
      $('#drTitle').textContent = 'السلة';
      $('#drBody').innerHTML = `<div class="empty" style="padding:80px 10px"><div style="width:72px;height:74px;margin:0 auto 16px;opacity:.5">${RC.logo()}</div>السلة فاضية.</div>`;
      $('#drFoot').innerHTML = `<a class="btn btn-primary" href="./" data-close>تسوّق دلوقتي</a>`; return;
    }
    const sum = `${t.save > 0 ? `<div class="sum save"><span>وفّرت</span><b>− ${money(t.save)}</b></div>` : ''}
      <div class="sum"><span>المنتجات</span><b>${money(t.sub)}</b></div>
      <div class="sum"><span>الشحن</span><b>${t.ship ? money(t.ship) : 'مجاني'}</b></div>
      <div class="sum total"><span>الإجمالي</span><b>${money(t.total)}</b></div>`;
    if (view === 'cart') {
      $('#drTitle').textContent = `السلة (${n})`;
      $('#drBody').innerHTML = t.ls.map(l => `<div class="ci"><a href="${RC.productUrl(l.p)}"><img src="${DQ.img(l.p)}" alt="" onerror="this.src='${FALLBACK}'"></a>
        <div><h4 class="en"><a href="${RC.productUrl(l.p)}">${esc(l.p.name)}</a></h4>${DQ.priceHTML(l.p)}<div class="qty"><button data-q="${l.id}" data-d="-1" aria-label="تقليل">−</button><span>${l.qty}</span><button data-q="${l.id}" data-d="1" aria-label="زيادة">+</button></div></div>
        <button class="rm" data-rm="${l.id}">حذف</button></div>`).join('') +
        (t.fso != null && t.sub < t.fso ? `<div style="margin-top:16px"><div class="ship-note">ضيف ${money(t.fso - t.sub)} كمان والشحن يبقى مجاني</div><div class="ship-bar"><i style="width:${Math.min(100, t.sub / t.fso * 100)}%"></i></div></div>` : '');
      $('#drFoot').innerHTML = sum + `<button class="btn btn-amber" id="goCheckout">إتمام الطلب</button>`;
      $('#goCheckout').onclick = () => { view = 'checkout'; renderCart(); };
    } else if (view === 'checkout') {
      $('#drTitle').textContent = 'بيانات الطلب';
      let saved = {}; try { saved = JSON.parse(localStorage.getItem('dq-cust') || localStorage.getItem('rc-cust') || '{}') } catch (e) {}
      if (DQ.user && !saved.name) saved.name = userName(DQ.user);
      $('#drBody').innerHTML = (DQ.user ? `<div class="acc-note ok">الطلب هيتحفظ في حسابك <b class="en">${esc(DQ.user.email || '')}</b></div>` : `<div class="acc-note">عندك حساب؟ <button type="button" class="acc-link" id="coLogin">سجّل دخول</button> عشان طلبك يتحفظ وتتابعه.</div>`) + `<form class="form-grid" id="coForm" autocomplete="on">
        <div class="field"><label for="f-name">الاسم *</label><input id="f-name" class="input" name="name" required value="${esc(saved.name || '')}" autocomplete="name"></div>
        <div class="field"><label for="f-phone">رقم الموبايل *</label><input id="f-phone" class="input en" name="phone" required inputmode="tel" pattern="[0-9+ ]{10,15}" value="${esc(saved.phone || '')}" autocomplete="tel" dir="ltr" style="text-align:right"></div>
        <div class="field"><label id="cityLbl">المحافظة *</label><div class="dd" id="cityDD">
          <button type="button" class="input dd-btn" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="cityLbl"><span class="dd-val ${saved.city ? '' : 'ph'}">${esc(saved.city || 'اختار المحافظة')}</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></button>
          <input type="hidden" name="city" id="f-city" value="${esc(saved.city || '')}">
          <div class="dd-pop"><input class="input dd-search" placeholder="دوّر على محافظتك…" aria-label="بحث"><div class="dd-list" role="listbox">${GOV.map(c => `<button type="button" role="option" data-v="${c}" class="${c === saved.city ? 'on' : ''}" aria-selected="${c === saved.city}">${c}</button>`).join('')}</div></div></div></div>
        <div class="field"><label for="f-addr">العنوان بالتفصيل *</label><textarea id="f-addr" class="input addr" name="address" required rows="4" placeholder="المنطقة، الشارع، رقم العمارة، الدور والشقة، علامة مميزة">${esc(saved.address || '')}</textarea></div>
        <div class="field"><label for="f-notes">ملاحظات</label><textarea id="f-notes" class="input" name="notes" rows="2" placeholder="اختياري">${esc(saved.notes || '')}</textarea></div></form>`;
      $('#drFoot').innerHTML = sum + `<span class="ship-note">الدفع كاش عند الاستلام.</span><div style="display:flex;gap:8px"><button class="btn btn-ghost" id="back">رجوع</button><button class="btn btn-amber" id="place" style="flex:1">تأكيد الطلب · ${money(t.total)}</button></div>`;
      $('#back').onclick = () => { view = 'cart'; renderCart(); };
      if ($('#coLogin')) $('#coLogin').onclick = () => DQ.openAccount('login');
      $('#place').onclick = placeOrder;
      // keep what the customer typed (survives any re-render or reload)
      const keep = () => { try { localStorage.setItem('dq-cust', JSON.stringify(Object.fromEntries(new FormData($('#coForm'))))) } catch (e) {} };
      $('#coForm').addEventListener('input', keep);
      const dd = $('#cityDD'), btn = dd.querySelector('.dd-btn'), q = dd.querySelector('.dd-search');
      const open = v => { dd.classList.toggle('open', v); btn.setAttribute('aria-expanded', v); if (v) { q.value = ''; dd.querySelectorAll('.dd-list button').forEach(b => b.hidden = false); setTimeout(() => q.focus(), 30); const on = dd.querySelector('.dd-list .on'); on && on.scrollIntoView({ block: 'center' }); } };
      btn.onclick = () => open(!dd.classList.contains('open'));
      q.oninput = () => { const t = q.value.trim(); dd.querySelectorAll('.dd-list button').forEach(b => b.hidden = t && !b.dataset.v.includes(t)); };
      q.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const f = dd.querySelector('.dd-list button:not([hidden])'); f && f.click(); } if (e.key === 'Escape') { e.stopPropagation(); open(false); btn.focus(); } };
      dd.querySelector('.dd-list').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; $('#f-city').value = b.dataset.v; const v = dd.querySelector('.dd-val'); v.textContent = b.dataset.v; v.classList.remove('ph'); dd.classList.remove('err');
        dd.querySelectorAll('.dd-list button').forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); }); open(false); keep(); };
      document.addEventListener('pointerdown', e => { if (!dd.contains(e.target)) open(false); });
    }
  }
  async function placeOrder() {
    const f = $('#coForm'); if (!f.reportValidity()) return;
    if (!$('#f-city').value) { $('#cityDD').classList.add('err'); $('#cityDD .dd-btn').click(); return DQ.toast('اختار المحافظة', 'err'); }
    const d = Object.fromEntries(new FormData(f));
    try { localStorage.setItem('dq-cust', JSON.stringify({ name: d.name, phone: d.phone, city: d.city, address: d.address })) } catch (e) {} /* notes are not kept for the next order */
    const btn = $('#place'); btn.disabled = true; btn.textContent = 'جاري الإرسال...';
    const { data, error } = await sb.rpc('shop_place_order', { customer: d, items: DQ.cart.map(c => ({ id: c.id, qty: c.qty })) });
    if (error) { btn.disabled = false; btn.textContent = 'تأكيد الطلب'; DQ.toast(error.message || 'حصل خطأ، جرّب تاني', 'err'); DQ.load(); return; }
    const ls = lines(); DQ.cart = []; saveCart(); view = 'done';
    notifyOrder(data, d, ls);
    DQ.rememberOrder({ code: data.code, phone: d.phone, total: data.total, at: new Date().toISOString(), status: 'new', items: ls.map(l => ({ name: l.p.name, qty: l.qty, image: (l.p.images || [])[0] || '' })) });
    $('#cartCount').classList.remove('show'); $('#drTitle').textContent = 'تم الطلب';
    const msg = encodeURIComponent(`طلب جديد ${data.code} — DAQQA\n${ls.map(l => `${l.p.name} × ${l.qty}`).join('\n')}\nالإجمالي: ${money(data.total)}\nالاسم: ${d.name}`);
    $('#drBody').innerHTML = `<div class="success"><div class="m">${RC.logo()}</div><h3>طلبك وصل!</h3><p style="color:var(--muted)">هنكلمك قريب لتأكيد الطلب. رقم الطلب:</p><code class="en">${esc(data.code)}</code><p style="color:var(--muted)">الإجمالي: <b class="en" style="color:var(--ink)">${money(data.total)}</b></p><div class="acc-order" data-trk="${esc(data.code)}" style="text-align:right">${DQ.tracker('new')}</div><p style="color:var(--muted);font-size:13px">هتشوف كل خطوة هنا وفي «حسابي» أول ما تحصل.</p>${DQ.user ? '<p style="color:var(--muted);font-size:14px">اتحفظ في حسابك، تقدر تتابعه من «حسابي».</p>' : ''}</div>`;
    $('#drFoot').innerHTML = (DQ.wa() ? `<a class="btn btn-amber" target="_blank" rel="noopener" href="https://wa.me/${DQ.wa()}?text=${msg}">أكّد على واتساب</a>` : '') + `<button class="btn btn-ghost" data-close>كمّل تسوّق</button>`;
    DQ.load().then(() => DQ.onRefresh && DQ.onRefresh());
  }
  // email the shop owner every new order with all details + a link that opens it in the dashboard
  function notifyOrder(data, d, ls) {
    if (!RC.notifyEmail) return;
    const base = location.origin + location.pathname.replace(/[^/]*$/, '');
    const items = ls.map(l => `• ${l.p.name} (${RC.sku(l.p)}) × ${l.qty} = ${money(finalPrice(l.p) * l.qty)}`).join('\n');
    const body = { _subject: `طلب جديد ${data.code} — ${money(data.total)} — DAQQA`, _template: 'table', _captcha: 'false',
      'رقم الطلب': data.code, 'الإجمالي': money(data.total), 'المنتجات': items,
      'اسم العميل': d.name, 'التليفون': d.phone, 'واتساب العميل': 'https://wa.me/' + String(d.phone || '').replace(/\D/g, '').replace(/^0/, '20'),
      'المحافظة': d.city || '', 'العنوان': d.address || '', 'ملاحظات': d.notes || '—',
      'افتح الطلب في الداشبورد': base + 'admin.html#orders/' + encodeURIComponent(data.code) };
    try { fetch('https://formsubmit.co/ajax/' + RC.notifyEmail, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {}); } catch (e) {}
  }
  DQ.openCart = (v = 'cart') => { DQ.closeAll(); view = v; renderCart(); $('#drawer').classList.add('on'); $('#overlay').classList.add('on'); document.body.style.overflow = 'hidden'; };
  DQ.closeAll = () => {
    ['#drawer', '#overlay', '#menuSheet', '#searchSheet', '#favSheet', '#accSheet'].forEach(s => $(s) && $(s).classList.remove('on'));
    document.body.style.overflow = '';
    if (view === 'done') { view = 'cart'; setTimeout(renderCart, 400); }
  };

  /* ---------- account: Google or email + password; orders are saved to the account ---------- */
  DQ.user = null; DQ.isAdmin = false;
  let accMode = 'login', accMsg = '';
  const STATUS = { new: 'تم الطلب', confirmed: 'جاري التجهيز', shipped: 'في الطريق', delivered: 'تم التسليم', cancelled: 'اتلغى' };
  /* ---------- order tracking: 4 steps, live ---------- */
  const STEPS = [['new', 'تم الطلب', 'وصلنا طلبك، هنكلمك قريب للتأكيد.', 'bag'], ['confirmed', 'جاري التجهيز', 'استلمنا طلبك وبنجهزه دلوقتي.', 'gift'], ['shipped', 'في الطريق', 'طلبك خرج مع المندوب وفي الطريق ليك.', 'truck'], ['delivered', 'تم التسليم', 'تم استلام الطلب — نتمنى تكون مبسوط بالخدمة', 'heart']];
  DQ.tracker = (st) => {
    if (st === 'cancelled') return `<div class="trk off"><p class="trk-msg">الطلب ده اتلغى. لو ده غلط كلمنا على واتساب.</p></div>`;
    const i = Math.max(0, STEPS.findIndex(x => x[0] === st));
    return `<div class="trk ${i === 3 ? 'done-all' : ''}" style="--p:${i / 3}"><div class="trk-line"><i></i></div><ol>${STEPS.map(([k, l, m, ic], j) => `<li class="${j < i ? 'done' : j === i ? 'cur' : ''}"><span class="trk-dot">${ICON[ic] || ''}</span><b>${l}</b></li>`).join('')}</ol><p class="trk-msg">${STEPS[i][2]}</p></div>`;
  };
  // orders placed on this device (works for guests too: tracked by code + phone)
  const mine = () => { try { return JSON.parse(localStorage.getItem('dq-my-orders') || '[]') } catch (e) { return [] } };
  const saveMine = l => { try { localStorage.setItem('dq-my-orders', JSON.stringify(l.slice(0, 30))) } catch (e) {} };
  DQ.rememberOrder = (o) => saveMine([o, ...mine().filter(x => x.code !== o.code)]);
  const orderCard = o => `<div class="acc-order" data-trk="${esc(o.code)}"><div class="ao-top"><code class="en">${esc(o.code)}</code><span class="ao-st st-${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span></div>
      ${DQ.tracker(o.status)}
      <div class="ao-items">${(o.items || o.shop_order_items || []).map(i => `<span>${i.image ? `<img src="${esc(i.image)}" alt="">` : ''}<em class="en">${esc(i.name)}</em> × ${i.qty}</span>`).join('')}</div>
      <div class="ao-bot"><span>${new Date(o.created_at || o.at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}</span><b class="en">${money(o.total)}</b></div></div>`;
  async function trackLocal(codesToSkip = []) {
    const list = mine().filter(o => !codesToSkip.includes(o.code)), out = [];
    for (const o of list) { const r = await sb.rpc('shop_track_order', { p_code: o.code, p_phone: o.phone }).catch(() => ({})); if (r && r.data) out.push(r.data); else out.push({ code: o.code, status: o.status || 'new', total: o.total, created_at: o.at, items: o.items || [] }); }
    return out;
  }
  // a status changed → update every tracker on the page + tell the customer
  function applyStatus(code, st) {
    const l = mine(), o = l.find(x => x.code === code); const was = o ? o.status : null;
    if (o) { o.status = st; saveMine(l); }
    document.querySelectorAll(`[data-trk="${CSS.escape(code)}"]`).forEach(el => { const t = el.querySelector('.trk'), b = el.querySelector('.ao-st'); if (t) t.outerHTML = DQ.tracker(st); if (b) { b.textContent = STATUS[st] || st; b.className = 'ao-st st-' + st; } });
    if (was !== st) DQ.toast(st === 'delivered' ? `تم تسليم طلبك ${code} — نتمنى تكون مبسوط بالخدمة` : `طلبك ${code}: ${STATUS[st] || st}`, 'ok');
  }
  // live for signed-in customers (realtime) + light polling for orders on this device
  let myCh = null;
  function liveOrders(u) {
    if (myCh) { sb.removeChannel(myCh); myCh = null; }
    if (u) myCh = sb.channel('my-orders-' + u.id).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'shop_orders', filter: 'user_id=eq.' + u.id }, p => p.new && p.new.code && applyStatus(p.new.code, p.new.status)).subscribe();
  }
  async function pollMine() {
    if (document.hidden) return;
    for (const o of mine().filter(x => !['delivered', 'cancelled'].includes(x.status))) {
      const r = await sb.rpc('shop_track_order', { p_code: o.code, p_phone: o.phone }).catch(() => null);
      if (r && r.data && r.data.status && r.data.status !== o.status) applyStatus(o.code, r.data.status);
    }
  }
  setInterval(pollMine, 20000); document.addEventListener('visibilitychange', pollMine); setTimeout(pollMine, 4000);
  const userName = u => (u && (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name))) || (u && u.email ? u.email.split('@')[0] : '');
  async function setUser(u) {
    const changed = ((DQ.user && DQ.user.id) || null) !== ((u && u.id) || null);
    DQ.user = u || null; DQ.isAdmin = false; if (changed) liveOrders(DQ.user);
    const dot = $('#accDot'); if (dot) dot.classList.toggle('on', !!u);
    if (u) { try { const r = await sb.rpc('shop_is_admin'); DQ.isAdmin = !!r.data; } catch (e) {} }
    if ($('#accSheet') && $('#accSheet').classList.contains('on')) renderAccount();
    if (changed && view === 'checkout' && $('#drawer') && $('#drawer').classList.contains('on')) renderCart();
  }
  const back = () => location.origin + location.pathname + location.search;
  DQ.signInGoogle = async () => {
    const ok = await fetch(RC.url + '/auth/v1/settings', { headers: { apikey: RC.key } }).then(r => r.json()).then(j => j.external && j.external.google).catch(() => true);
    if (!ok) return DQ.toast('الدخول بجوجل لسه مش متفعل، ادخل بالإيميل', 'err');
    const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: back() } });
    if (error) DQ.toast('الدخول بجوجل مش متاح دلوقتي', 'err');
  };
  function authError(m) {
    m = String(m || '');
    if (/invalid login/i.test(m)) return 'الإيميل أو الباسورد غلط';
    if (/not confirmed/i.test(m)) return 'لازم تأكد الإيميل الأول، بص على رسالة التأكيد';
    if (/already registered|already exists/i.test(m)) return 'الإيميل ده عليه حساب، سجّل دخول';
    if (/at least|weak|short/i.test(m)) return 'الباسورد لازم 6 حروف على الأقل';
    if (/rate|seconds/i.test(m)) return 'استنى دقيقة وجرّب تاني';
    return 'حصلت مشكلة، جرّب تاني';
  }
  async function renderAccount() {
    const box = $('#accBody'); if (!box) return;
    const u = DQ.user;
    if (!u) {
      $('#accTitle').textContent = accMode === 'signup' ? 'حساب جديد' : accMode === 'forgot' ? 'نسيت الباسورد' : 'تسجيل الدخول';
      const note = accMsg ? `<div class="acc-note">${esc(accMsg)}</div>` : '';
      if (accMode === 'forgot') {
        box.innerHTML = `<p class="acc-lead">اكتب إيميلك وهنبعتلك لينك تعمل منه باسورد جديد.</p>${note}
          <form class="acc-form" id="accForm"><div class="field"><label for="a-em">الإيميل</label><input id="a-em" class="input en" type="email" required autocomplete="email" dir="ltr"></div>
          <button class="btn btn-amber" type="submit">ابعت اللينك</button></form>
          <button class="acc-link" data-mode="login">← رجوع لتسجيل الدخول</button>`;
      } else {
        const up = accMode === 'signup';
        box.innerHTML = `<p class="acc-lead">${up ? 'اعمل حساب وكل طلباتك هتتحفظ فيه.' : 'ادخل وشوف طلباتك، والطلبات الجاية تتحفظ في حسابك.'}</p>${note}
          <div class="g-only" hidden><button class="btn acc-google" id="gBtn" type="button">${ICON.google}<span>${up ? 'سجّل بحساب Google' : 'ادخل بحساب Google'}</span></button>
          <div class="acc-or"><span>أو بالإيميل</span></div></div>
          <form class="acc-form" id="accForm" autocomplete="on">
            ${up ? `<div class="field"><label for="a-name">الاسم</label><input id="a-name" class="input" required autocomplete="name"></div>` : ''}
            <div class="field"><label for="a-em">الإيميل</label><input id="a-em" class="input en" type="email" required autocomplete="email" dir="ltr"></div>
            <div class="field"><label for="a-pw">الباسورد</label><input id="a-pw" class="input en" type="password" required minlength="6" autocomplete="${up ? 'new-password' : 'current-password'}" dir="ltr"></div>
            <button class="btn btn-amber" type="submit" id="accSubmit">${up ? 'اعمل الحساب' : 'دخول'}</button>
          </form>
          ${up ? '' : '<button class="acc-link" data-mode="forgot">نسيت الباسورد؟</button>'}
          <div class="acc-switch">${up ? 'عندك حساب؟ <button class="acc-link" data-mode="login">سجّل دخول</button>' : 'أول مرة؟ <button class="acc-link" data-mode="signup">اعمل حساب</button>'}</div>
          ${mine().length ? '<h4 class="acc-h">طلباتك من الجهاز ده</h4><div id="devOrders"><div class="acc-empty">جاري التحميل…</div></div>' : ''}`;
        if (mine().length) trackLocal().then(l => { const d = $('#devOrders'); if (d) d.innerHTML = l.map(orderCard).join(''); });
        $('#gBtn').onclick = DQ.signInGoogle;
        RC.googleOn().then(on => { const g = box.querySelector('.g-only'); if (g) g.hidden = !on; });
      }
      box.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { accMode = b.dataset.mode; accMsg = ''; renderAccount(); });
      $('#accForm').onsubmit = async e => {
        e.preventDefault(); const btn = e.target.querySelector('button[type=submit]'); btn.disabled = true;
        const em = $('#a-em').value.trim().toLowerCase(); let r;
        if (accMode === 'forgot') {
          r = await sb.auth.resetPasswordForEmail(em, { redirectTo: back() });
          btn.disabled = false; accMsg = r.error ? authError(r.error.message) : 'لو الإيميل عليه حساب هيوصلك لينك خلال دقيقة. بص في الـ Spam لو مالقيتهوش.'; return renderAccount();
        }
        const pw = $('#a-pw').value;
        if (accMode === 'signup') {
          r = await sb.auth.signUp({ email: em, password: pw, options: { data: { full_name: $('#a-name').value.trim() }, emailRedirectTo: back() } });
          btn.disabled = false;
          if (r.error) { accMsg = authError(r.error.message); return renderAccount(); }
          if (!r.data.session) { accMode = 'login'; accMsg = 'بعتنالك إيميل تأكيد، افتحه وبعدين سجّل دخول.'; return renderAccount(); }
        } else {
          r = await sb.auth.signInWithPassword({ email: em, password: pw });
          btn.disabled = false;
          if (r.error) { accMsg = authError(r.error.message); return renderAccount(); }
        }
        accMsg = ''; DQ.toast('أهلًا ' + userName(r.data.user), 'ok');
      };
      return;
    }
    $('#accTitle').textContent = 'حسابي';
    const nm = userName(u), av = (u.user_metadata && u.user_metadata.avatar_url) || '';
    box.innerHTML = `<div class="acc-me">${av ? `<img src="${esc(av)}" alt="" referrerpolicy="no-referrer">` : `<span>${esc((nm[0] || '?').toUpperCase())}</span>`}
        <div><b>${esc(nm)}</b><small class="en">${esc(u.email || '')}</small></div></div>
      ${DQ.isAdmin ? `<a class="btn btn-amber acc-admin" href="admin.html">لوحة التحكم</a>` : ''}
      <h4 class="acc-h">طلباتي</h4><div id="accOrders"><div class="acc-empty">جاري التحميل…</div></div>
      <button class="btn btn-ghost acc-out" id="accOut">تسجيل خروج</button>`;
    $('#accOut').onclick = async () => { await sb.auth.signOut(); DQ.toast('اتسجل الخروج'); };
    const { data, error } = await sb.from('shop_orders').select('code,status,total,created_at,shop_order_items(name,qty,image)').eq('user_id', u.id).order('created_at', { ascending: false }).limit(50);
    const el = $('#accOrders'); if (!el) return;
    const acc = error ? [] : data, extra = await trackLocal(acc.map(o => o.code));
    const all = [...acc, ...extra].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (!$('#accOrders')) return;
    el.innerHTML = all.length ? all.map(orderCard).join('') : '<div class="acc-empty">لسه مافيش طلبات. أي طلب تعمله هيظهر هنا وتتابعه خطوة بخطوة.</div>';
  }
  DQ.openAccount = (mode) => { if (mode) accMode = mode; accMsg = ''; openSheet('#accSheet'); renderAccount(); };
  sb.auth.onAuthStateChange((ev, session) => {
    if (ev === 'PASSWORD_RECOVERY') { setTimeout(() => { openSheet('#accSheet'); renderReset(); }, 300); return; }
    setUser(session && session.user);
  });
  function renderReset() {
    $('#accTitle').textContent = 'باسورد جديد';
    $('#accBody').innerHTML = `<form class="acc-form" id="rsForm"><div class="field"><label for="r-pw">الباسورد الجديد</label><input id="r-pw" class="input en" type="password" minlength="6" required autocomplete="new-password" dir="ltr"></div><button class="btn btn-amber" type="submit">حفظ</button></form>`;
    $('#rsForm').onsubmit = async e => { e.preventDefault(); const { error } = await sb.auth.updateUser({ password: $('#r-pw').value }); if (error) return DQ.toast(authError(error.message), 'err'); DQ.toast('اتغير الباسورد ✓', 'ok'); renderAccount(); };
  }

  // the page is shown only once fonts, data and the first pictures are in (each wait is capped, so a slow line still opens)
  const cap = (p, ms) => Promise.race([p, new Promise(r => setTimeout(r, ms))]);
  const firstImages = () => Promise.all([...document.querySelectorAll('img')].filter(i => { const r = i.getBoundingClientRect(); return r.top < innerHeight * 1.2 && r.bottom > -50 && r.width; }).slice(0, 8)
    .map(i => i.complete ? null : new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); })));
  let readyRes; window.DQ_READY = new Promise(r => readyRes = r);
  window.DQ_reveal = () => {
    const d = document.documentElement, L = document.getElementById('dqLoad'), bar = document.getElementById('dqBar');
    if (bar) { bar.classList.add('done'); setTimeout(() => bar.remove(), 500); }
    if (d.classList.contains('dq-loading') && L) { L.classList.add('out'); d.classList.remove('dq-loading'); setTimeout(() => L.remove(), 950); }
    else { d.classList.remove('dq-loading'); L && L.remove(); }
    window.DQ_reveal = () => {};
    DQ.reveal(); readyRes();
  };
  if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  DQ.start = async (active, onReady) => {
    if (!window.DQ_LOADER) intro(); chrome(active); mouseFx();
    try { await cap(DQ.load(), 15000); } catch (e) { console.error(e); DQ.loadError = true; }
    onReady && onReady();
    await cap(Promise.all([document.fonts ? document.fonts.ready : null, firstImages()]), 3500);
    window.DQ_reveal();
  };
})();
