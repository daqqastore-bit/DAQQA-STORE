/**
 * DAQQA — Google Sheet للحسابات
 * الشيت ده بيستقبل الطلبات والمصاريف من لوحة التحكم لوحده، وبينسّق نفسه ويعمل صفحة «الملخص» بعد كل تعديل.
 *
 * التركيب / التحديث:
 * 1) افتح الشيت ← Extensions ← Apps Script ← امسح الكود القديم كله والصق الملف ده ← Save.
 * 2) من القايمة اللي فوق اختار الدالة setup ← Run (أول مرة بس هيطلب صلاحيات ← وافق).
 * 3) لو أول مرة: Deploy ← New deployment ← Web app · Execute as: Me · Who has access: Anyone ← انسخ اللينك (آخره /exec).
 *    لو بتحدّث كود موجود: Deploy ← Manage deployments ← ✏️ ← Version: New version ← Deploy (اللينك بيفضل زي ما هو).
 * 4) افتح لوحة التحكم مرة، وهي هتبعت كل الطلبات والمصاريف للشيت من الأول.
 */

const SECRET = 'PUT-THE-SECRET-FROM-ADMIN-SETTINGS-HERE';   // لازم يفضل زي اللي في لوحة التحكم ← الإعدادات

const SOLD = ['تم الاستلام', 'في التوصيل', 'تم التسليم'];          // الطلبات اللي اتباعت فعلاً
const STATUS_ORDER = ['جديد', 'تم الاستلام', 'في التوصيل', 'تم التسليم', 'ملغي', 'مرتجع'];
const STATUS_COLORS = { 'جديد': '#FBEBD3', 'تم الاستلام': '#DDE6F4', 'في التوصيل': '#E9DFF5', 'تم التسليم': '#DDEFD9', 'ملغي': '#F6DCD5', 'مرتجع': '#F7E4D2' };
const C = { dark: '#20160E', gold: '#D0B48C', brown: '#8A6438', band: '#F8F3EC', line: '#E4D8C6', green: '#3F6B34', red: '#B04834' };
const MONEY = '#,##0 "ج.م";[Red]-#,##0 "ج.م"';

const SHEETS = {
  orders: {
    name: 'الطلبات', key: 'code',
    cols: [['code', 'كود الطلب', 'text'], ['date', 'التاريخ', 'text'], ['month', 'الشهر', 'text'], ['customer', 'العميل'], ['phone', 'التليفون', 'text'],
           ['city', 'المحافظة'], ['items', 'المنتجات', 'wide'], ['section', 'القسم'], ['status', 'الحالة'], ['total', 'إجمالي الطلب', 'money'],
           ['sale', 'سعر البيع', 'money'], ['cost', 'تكلفة المنتجات', 'money'], ['ship_cost', 'تكلفة الشحن', 'money'], ['ship_payer', 'الشحن على'],
           ['return_loss', 'خسارة المرتجع', 'money'], ['net', 'صافي الربح', 'money'], ['location', 'اللوكيشن']]
  },
  expenses: {
    name: 'المصاريف', key: 'id',
    cols: [['id', 'رقم', 'text'], ['date', 'التاريخ', 'text'], ['month', 'الشهر', 'text'], ['category', 'البند'], ['amount', 'المبلغ', 'money'], ['note', 'ملاحظة', 'wide']]
  }
};
const SUMMARY = 'الملخص';

/* ---------------- web app ---------------- */
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'bad json' }); }
  if (d.secret !== SECRET) return out({ ok: false, error: 'unauthorized' });
  const lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    if (d.action === 'upsert') upsert(d.sheet, d.row);
    else if (d.action === 'delete') remove(d.sheet, d.id);
    else if (d.action === 'merge') { mergeAll('orders', d.orders || []); mergeAll('expenses', d.expenses || []); }
    else if (d.action === 'replace') { replaceAll('orders', d.orders || []); replaceAll('expenses', d.expenses || []); }
    refresh();
    return out({ ok: true });
  } finally { lock.releaseLock(); }
}
// فتح اللينك في المتصفح بيقول لو الشيت شغال
function doGet(e) {
  const ok = e && e.parameter && e.parameter.secret === SECRET;
  return out({ ok: true, app: 'DAQQA sheet', authorized: !!ok });
}
function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// قايمة DAQQA جوه الشيت: تحديث يدوي لو احتجته
function onOpen() { SpreadsheetApp.getUi().createMenu('DAQQA').addItem('تحديث التنسيق والملخص', 'setup').addToUi(); }

// شغّلها مرة بعد ما تلصق الكود (وتقدر تشغلها في أي وقت)
function setup() { sheetFor('orders'); sheetFor('expenses'); refresh(); }

function refresh() { formatData('orders'); formatData('expenses'); buildSummary(); }

/* ---------------- data sheets ---------------- */
function sheetFor(kind) {
  const def = SHEETS[kind]; if (!def) throw new Error('unknown sheet ' + kind);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(def.name);
  if (!sh) sh = ss.insertSheet(def.name);
  const heads = def.cols.map(c => c[1]), n = heads.length;
  const cur = sh.getLastRow() ? sh.getRange(1, 1, 1, Math.max(n, sh.getLastColumn())).getValues()[0] : [];
  if (cur.slice(0, n).join('|') !== heads.join('|') || cur.slice(n).some(v => v !== '')) {
    // الأعمدة اتغيرت: نمسح القديم ولوحة التحكم بتبعت كل حاجة من جديد أول ما تتفتح
    sh.clear(); sh.getRange(1, 1, 1, n).setValues([heads]);
  }
  if (sh.getMaxColumns() > n) sh.deleteColumns(n + 1, sh.getMaxColumns() - n);
  def.cols.forEach((c, i) => { if (c[2] === 'text') sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@'); });
  sh.setRightToLeft(true); sh.setFrozenRows(1);
  return { sh, def };
}

function dmy(v) {
  const s = String(v || ''), m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}
function monthOf(v) {
  const s = String(v || ''); let m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/); if (m) return `${m[3]}-${m[2]}`;
  m = s.match(/^(\d{4})-(\d{2})/); return m ? `${m[1]}-${m[2]}` : '';
}
function toRow(def, row) {
  const r = Object.assign({}, row);
  r.date = dmy(r.date); r.month = monthOf(r.date);
  if (r.items) r.items = String(r.items).split(' | ').join('\n');
  if (r.location && /^https:\/\//.test(r.location)) r.location = `=HYPERLINK("${String(r.location).replace(/"/g, '')}","📍 فتح الخريطة")`;
  return def.cols.map(([k]) => r[k] === undefined || r[k] === null ? '' : r[k]);
}
function findRow(sh, def, key) {
  const n = sh.getLastRow(); if (n < 2) return -1;
  const col = def.cols.findIndex(c => c[0] === def.key) + 1;
  const vals = sh.getRange(2, col, n - 1, 1).getValues();
  for (let i = 0; i < vals.length; i++) if (String(vals[i][0]) === String(key)) return i + 2;
  return -1;
}
function upsert(kind, row) {
  const { sh, def } = sheetFor(kind);
  const r = findRow(sh, def, row[def.key]), values = [toRow(def, row)];
  if (r > 0) sh.getRange(r, 1, 1, def.cols.length).setValues(values);
  else sh.getRange(Math.max(2, sh.getLastRow() + 1), 1, 1, def.cols.length).setValues(values);
}
function remove(kind, key) {
  const { sh, def } = sheetFor(kind);
  const r = findRow(sh, def, key); if (r > 0) sh.deleteRow(r);
}
// many rows at once: updates the ones already there and adds the new ones, keeps everything else (one read + one write)
function mergeAll(kind, rows) {
  if (!rows.length) return;
  const { sh, def } = sheetFor(kind), n = def.cols.length, last = sh.getLastRow(), ki = def.cols.findIndex(c => c[0] === def.key);
  const cur = last > 1 ? sh.getRange(2, 1, last - 1, n).getFormulas() : [];
  const vals = last > 1 ? sh.getRange(2, 1, last - 1, n).getValues() : [];
  const data = vals.map((v, i) => v.map((x, j) => cur[i][j] || x));   // keep the map links as formulas
  const at = {}; data.forEach((v, i) => at[String(v[ki])] = i);
  rows.forEach(r => { const v = toRow(def, r), i = at[String(r[def.key])]; if (i === undefined) { at[String(r[def.key])] = data.length; data.push(v); } else data[i] = v; });
  if (data.length) sh.getRange(2, 1, data.length, n).setValues(data);
}
function replaceAll(kind, rows) {
  const { sh, def } = sheetFor(kind);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, def.cols.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, def.cols.length).setValues(rows.map(r => toRow(def, r)));
}

// نص الخلايا، wrap، عرض تلقائي، ألوان الصفوف، وألوان الحالات
function formatData(kind) {
  const { sh, def } = sheetFor(kind), n = def.cols.length, last = Math.max(sh.getLastRow(), 2);
  const all = sh.getRange(1, 1, last, n);
  all.setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true).setFontFamily('Cairo').setFontSize(11);
  sh.getRange(1, 1, 1, n).setFontWeight('bold').setFontColor(C.gold).setBackground(C.dark).setFontSize(11);
  sh.setRowHeight(1, 40);
  def.cols.forEach((c, i) => { if (c[2] === 'money') sh.getRange(2, i + 1, last, 1).setNumberFormat(MONEY); });
  sh.getBandings().forEach(b => b.remove());
  sh.getRange(1, 1, last, n).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, true, false)
    .setHeaderRowColor(C.dark).setFirstRowColor('#FFFFFF').setSecondRowColor(C.band);
  all.setBorder(true, true, true, true, true, true, C.line, SpreadsheetApp.BorderStyle.SOLID);
  // عرض تلقائي على قد الكلام، بحد أدنى وأقصى (الكلام الطويل بينزل تحت بعضه)
  sh.autoResizeColumns(1, n);
  def.cols.forEach((c, i) => { const w = sh.getColumnWidth(i + 1), max = c[2] === 'wide' ? 280 : 200; sh.setColumnWidth(i + 1, Math.min(max, Math.max(95, w + 24))); });
  if (last > 1) sh.autoResizeRows(2, last - 1);
  // لون الحالة
  if (kind === 'orders') {
    const col = def.cols.findIndex(c => c[0] === 'status') + 1, rng = sh.getRange(2, col, Math.max(1, last - 1), 1);
    sh.setConditionalFormatRules(Object.keys(STATUS_COLORS).map(s => SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(s).setBackground(STATUS_COLORS[s]).setBold(true).setRanges([rng]).build()));
    const net = def.cols.findIndex(c => c[0] === 'net') + 1; sh.getRange(2, net, Math.max(1, last - 1), 1).setFontWeight('bold');
  }
}

/* ---------------- summary ---------------- */
function readObjs(kind) {
  const { sh, def } = sheetFor(kind), n = sh.getLastRow();
  if (n < 2) return [];
  return sh.getRange(2, 1, n - 1, def.cols.length).getValues().map(v => { const o = {}; def.cols.forEach(([k], i) => o[k] = v[i]); return o; }).filter(o => o[def.key] !== '');
}
const num = v => +v || 0;
const pct = (a, b) => b ? a / b : 0;

function buildSummary() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SUMMARY); if (!s) s = ss.insertSheet(SUMMARY, 0);
  ss.setActiveSheet(s); ss.moveActiveSheet(1);
  s.getRange(1, 1, s.getMaxRows(), s.getMaxColumns()).breakApart();
  s.clear(); s.setConditionalFormatRules([]); s.getBandings().forEach(b => b.remove());
  s.setRightToLeft(true); s.setHiddenGridlines(true);
  if (s.getMaxColumns() < 12) s.insertColumnsAfter(s.getMaxColumns(), 12 - s.getMaxColumns());
  s.setColumnWidth(1, 24); for (let c = 2; c <= 11; c++) s.setColumnWidth(c, 128); s.setColumnWidth(12, 24);

  const orders = readObjs('orders'), exps = readObjs('expenses');
  const sold = orders.filter(o => SOLD.includes(o.status)), rets = orders.filter(o => o.status === 'مرتجع');
  const saleOf = o => o.sale !== '' ? num(o.sale) : num(o.total);
  const sales = sold.reduce((t, o) => t + saleOf(o), 0), cost = sold.reduce((t, o) => t + num(o.cost), 0);
  const shipMe = sold.reduce((t, o) => t + (o.ship_payer === 'عليا' ? num(o.ship_cost) : 0), 0);
  const loss = rets.reduce((t, o) => t + num(o.return_loss), 0), expT = exps.reduce((t, x) => t + num(x.amount), 0);
  const net = sales - cost - shipMe - loss - expT, missing = sold.filter(o => o.cost === '').length;

  // العنوان
  s.getRange('B2:K2').merge().setValue('DAQQA — ملخص الحسابات').setFontSize(20).setFontWeight('bold').setFontColor(C.brown);
  s.getRange('B3:K3').merge().setValue('آخر تحديث: ' + Utilities.formatDate(new Date(), 'Africa/Cairo', 'dd/MM/yyyy · h:mm a') + (missing ? `   ·   ${missing} طلب لسه من غير تكاليف (صافي الربح بتاعهم مش محسوب)` : '')).setFontColor('#8C7B66').setFontSize(10);
  s.setRowHeight(2, 44);

  // كروت الأرقام: 5 في كل صف، كل كارت عمودين
  const cards = [['إجمالي المبيعات', sales, 'money'], ['تكلفة البضاعة', cost, 'money'], ['الشحن على حسابي', shipMe, 'money'], ['خسارة المرتجعات', loss, 'money'], ['المصاريف', expT, 'money'],
                 ['صافي الربح', net, 'money', true], ['هامش الربح', pct(net, sales), 'pct'], ['طلبات اتباعت', sold.length, 'n'], ['متوسط الطلب', pct(sales, sold.length), 'money'], ['نسبة المرتجع', pct(rets.length, sold.length + rets.length), 'pct']];
  cards.forEach((k, i) => {
    const r = 5 + Math.floor(i / 5) * 3, c = 2 + (i % 5) * 2;
    s.getRange(r, c, 1, 2).merge().setValue(k[0]).setFontColor('#8C7B66').setFontSize(10);
    const v = s.getRange(r + 1, c, 1, 2).merge().setValue(k[1]).setFontSize(17).setFontWeight('bold').setFontColor(k[3] ? (k[1] < 0 ? C.red : C.green) : C.dark);
    v.setNumberFormat(k[2] === 'money' ? MONEY : k[2] === 'pct' ? '0.0%' : '#,##0');
    s.getRange(r, c, 2, 2).setBackground(k[3] ? '#EAF1E4' : C.band).setBorder(true, true, true, true, null, null, C.line, SpreadsheetApp.BorderStyle.SOLID);
    s.setRowHeight(r + 1, 38);
  });

  let row = 12;
  // حالة الطلبات · Luxury مقابل العادي
  const st = STATUS_ORDER.map(k => { const l = orders.filter(o => o.status === k); return [k, l.length, l.reduce((t, o) => t + num(o.total), 0)]; });
  const secs = ['عادي', 'Luxury'].map(k => { const l = sold.filter(o => o.section === k); return [k, l.length, l.reduce((t, o) => t + saleOf(o), 0), l.reduce((t, o) => t + num(o.net), 0)]; });
  row = Math.max(table(s, row, 2, 'حالة الطلبات', ['الحالة', 'عدد الطلبات', 'قيمة الطلبات'], st, [2], STATUS_COLORS),
                 table(s, row, 7, 'المتجر العادي و Luxury (المتباع)', ['القسم', 'الطلبات', 'المبيعات', 'صافي الربح'], secs, [2, 3]));

  // شهر بشهر
  const months = [...new Set(orders.map(o => o.month).concat(exps.map(x => x.month)).filter(Boolean))].sort().reverse();
  const mrows = months.map(m => {
    const so = sold.filter(o => o.month === m), re = rets.filter(o => o.month === m), ex = exps.filter(x => x.month === m);
    const sa = so.reduce((t, o) => t + saleOf(o), 0), co = so.reduce((t, o) => t + num(o.cost), 0), sh = so.reduce((t, o) => t + (o.ship_payer === 'عليا' ? num(o.ship_cost) : 0), 0);
    const lo = re.reduce((t, o) => t + num(o.return_loss), 0), e = ex.reduce((t, x) => t + num(x.amount), 0);
    return [m, so.length, sa, co, sh, lo, e, sa - co - sh - lo - e];
  });
  row = table(s, row, 2, 'شهر بشهر', ['الشهر', 'طلبات اتباعت', 'المبيعات', 'تكلفة البضاعة', 'الشحن عليا', 'المرتجعات', 'المصاريف', 'صافي الربح'], mrows, [2, 3, 4, 5, 6, 7], null, 7);

  // أكتر المنتجات · أكتر المحافظات
  const prod = {};
  sold.forEach(o => String(o.items).split('\n').forEach(l => { const m = l.match(/^(.*) × (\d+)$/); if (!m) return; const p = prod[m[1]] || (prod[m[1]] = [m[1], 0, 0]); p[1] += +m[2]; p[2]++; }));
  const prows = Object.values(prod).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const city = {};
  sold.forEach(o => { const k = o.city || '—', c = city[k] || (city[k] = [k, 0, 0]); c[1]++; c[2] += saleOf(o); });
  const crows = Object.values(city).sort((a, b) => b[1] - a[1]).slice(0, 10);
  row = Math.max(table(s, row, 2, 'أكتر المنتجات مبيعاً', ['المنتج', 'قطع اتباعت', 'عدد الطلبات'], prows, []),
                 table(s, row, 7, 'أكتر المحافظات', ['المحافظة', 'الطلبات', 'المبيعات'], crows, [2]));

  // المصاريف حسب البند
  const cat = {};
  exps.forEach(x => { const k = x.category || 'أخرى'; cat[k] = (cat[k] || 0) + num(x.amount); });
  const xrows = Object.keys(cat).map(k => [k, cat[k], pct(cat[k], expT)]).sort((a, b) => b[1] - a[1]);
  row = table(s, row, 2, 'المصاريف حسب البند', ['البند', 'المبلغ', 'النسبة'], xrows, [1], null, null, [2]);

  const used = s.getRange(1, 1, row, 12);
  used.setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true).setFontFamily('Cairo');
  if (s.getMaxRows() > row + 2) s.deleteRows(row + 3, s.getMaxRows() - row - 2);
}

// جدول بعنوان وهيدر؛ بيرجّع الصف اللي بعده. money/pctCols = أرقام الأعمدة (من 0). netCol = عمود بلون أخضر/أحمر
function table(s, r, c, title, heads, rows, moneyCols, colorMap, netCol, pctCols) {
  const w = heads.length;
  s.getRange(r, c, 1, w).merge().setValue(title).setFontSize(13).setFontWeight('bold').setFontColor(C.brown).setHorizontalAlignment('center');
  s.setRowHeight(r, 34);
  s.getRange(r + 1, c, 1, w).setValues([heads]).setBackground(C.dark).setFontColor(C.gold).setFontWeight('bold');
  s.setRowHeight(r + 1, 32);
  const data = rows.length ? rows : [[ 'لسه مافيش بيانات' ].concat(Array(w - 1).fill(''))];
  const body = s.getRange(r + 2, c, data.length, w);
  body.setValues(data);
  if (!rows.length) s.getRange(r + 2, c, 1, w).merge().setFontColor('#8C7B66');
  for (let i = 0; i < data.length; i++) s.getRange(r + 2 + i, c, 1, w).setBackground(i % 2 ? C.band : '#FFFFFF');
  if (rows.length) {
    (moneyCols || []).forEach(k => s.getRange(r + 2, c + k, data.length, 1).setNumberFormat(MONEY));
    (pctCols || []).forEach(k => s.getRange(r + 2, c + k, data.length, 1).setNumberFormat('0.0%'));
    if (colorMap) data.forEach((d, i) => colorMap[d[0]] && s.getRange(r + 2 + i, c).setBackground(colorMap[d[0]]).setFontWeight('bold'));
    if (netCol != null) s.getRange(r + 2, c + netCol, data.length, 1).setFontWeight('bold').setFontColor(C.green);
  }
  s.getRange(r + 1, c, data.length + 1, w).setBorder(true, true, true, true, true, true, C.line, SpreadsheetApp.BorderStyle.SOLID);
  return r + 2 + data.length + 2;
}
