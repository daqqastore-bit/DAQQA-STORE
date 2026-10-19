/**
 * DAQQA — Google Sheet للحسابات
 * الشيت ده بيستقبل الطلبات والمصاريف من لوحة التحكم ويحسب صافي الربح.
 *
 * التركيب (مرة واحدة):
 * 1) افتح الشيت ← Extensions ← Apps Script ← امسح أي كود والصق الملف ده كله ← Save.
 * 2) من القايمة اللي فوق اختار الدالة setup ← Run ← وافق على الصلاحيات.
 * 3) Deploy ← New deployment ← النوع Web app:
 *      Execute as: Me   ·   Who has access: Anyone
 *    ← Deploy ← انسخ الـ Web app URL (آخره /exec) وابعته.
 */

const SECRET = 'PUT-THE-SECRET-FROM-ADMIN-SETTINGS-HERE';   // لازم يفضل زي اللي في لوحة التحكم ← الإعدادات

const SHEETS = {
  orders: {
    name: 'الطلبات', key: 'code',
    cols: [['code', 'كود الطلب'], ['date', 'التاريخ'], ['customer', 'العميل'], ['phone', 'التليفون'], ['city', 'المحافظة'],
           ['items', 'المنتجات'], ['section', 'القسم'], ['status', 'الحالة'], ['sale', 'سعر البيع'], ['cost', 'تكلفة المنتجات'],
           ['ship_cost', 'تكلفة الشحن'], ['ship_payer', 'الشحن على'], ['return_loss', 'خسارة المرتجع'], ['net', 'صافي الربح'], ['location', 'اللوكيشن']]
  },
  expenses: {
    name: 'المصاريف', key: 'id',
    cols: [['id', 'رقم'], ['date', 'التاريخ'], ['category', 'البند'], ['amount', 'المبلغ'], ['note', 'ملاحظة']]
  }
};
const SUMMARY = 'الملخص';

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'bad json' }); }
  if (d.secret !== SECRET) return out({ ok: false, error: 'unauthorized' });
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    if (d.action === 'upsert') upsert(d.sheet, d.row);
    else if (d.action === 'delete') remove(d.sheet, d.id);
    else if (d.action === 'replace') { replaceAll('orders', d.orders || []); replaceAll('expenses', d.expenses || []); }
    return out({ ok: true });
  } finally { lock.releaseLock(); }
}

// فتح اللينك في المتصفح بيقول لو الشيت شغال
function doGet(e) {
  const ok = e && e.parameter && e.parameter.secret === SECRET;
  return out({ ok: true, app: 'DAQQA sheet', authorized: !!ok });
}

function out(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function sheetFor(kind) {
  const def = SHEETS[kind]; if (!def) throw new Error('unknown sheet ' + kind);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(def.name);
  if (!sh) { sh = ss.insertSheet(def.name); }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, def.cols.length).setValues([def.cols.map(c => c[1])]).setFontWeight('bold').setBackground('#20160E').setFontColor('#D0B48C');
    sh.setFrozenRows(1); sh.setRightToLeft(true);
  }
  return { sh, def };
}

function toRow(def, row) { return def.cols.map(([k]) => row[k] === undefined || row[k] === null ? '' : row[k]); }

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
  else sh.appendRow(values[0]);
}

function remove(kind, key) {
  const { sh, def } = sheetFor(kind);
  const r = findRow(sh, def, key); if (r > 0) sh.deleteRow(r);
}

function replaceAll(kind, rows) {
  const { sh, def } = sheetFor(kind);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, def.cols.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, def.cols.length).setValues(rows.map(r => toRow(def, r)));
}

// يجهّز التابات والملخص بالمعادلات — شغّله مرة واحدة بعد ما تلصق الكود
function setup() {
  sheetFor('orders'); sheetFor('expenses');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SUMMARY); if (!s) s = ss.insertSheet(SUMMARY, 0);
  s.clear(); s.setRightToLeft(true);
  const O = "'الطلبات'!", E = "'المصاريف'!";
  // الطلبات اللي اتباعت = تم الاستلام / في التوصيل / تم التسليم
  const ST = '{"تم الاستلام","في التوصيل","تم التسليم"}';
  const sold = (col, extra) => `=ARRAYFORMULA(SUM(SUMIFS(${O}${col}2:${col},${O}H2:H,${ST}${extra || ''})))`;
  const rows = [
    ['DAQQA — الحسابات', ''],
    ['', ''],
    ['إجمالي المبيعات', sold('I')],
    ['تكلفة البضاعة', sold('J')],
    ['الشحن على حسابي', sold('K', `,${O}L2:L,"عليا"`)],
    ['خسارة المرتجعات', `=SUMIF(${O}H2:H,"مرتجع",${O}M2:M)`],
    ['المصاريف', `=SUM(${E}D2:D)`],
    ['صافي الربح', '=B3-B4-B5-B6-B7'],
    ['هامش الربح', '=IF(B3=0,0,B8/B3)'],
    ['', ''],
    ['عدد الطلبات المتباعة', `=ARRAYFORMULA(SUM(COUNTIF(${O}H2:H,${ST})))`],
    ['عدد المرتجعات', `=COUNTIF(${O}H2:H,"مرتجع")`],
    ['عدد الملغي', `=COUNTIF(${O}H2:H,"ملغي")`]
  ];
  s.getRange(1, 1, rows.length, 2).setValues(rows);
  s.getRange('A1').setFontSize(16).setFontWeight('bold').setFontColor('#8A6438');
  s.getRange('B3:B8').setNumberFormat('#,##0 "ج.م"');
  s.getRange('B9').setNumberFormat('0.0%');
  s.getRange('A8:B8').setFontWeight('bold').setBackground('#E8F1E2');
  s.setColumnWidth(1, 200); s.setColumnWidth(2, 160);
}
