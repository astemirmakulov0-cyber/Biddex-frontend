// Run: node test/analytics.test.js   (no dependencies)
// The buyer's "Spending and prices" section of index.html: the pure helpers (periods, CSV, month labels, chart bars),
// the texts in English and Arabic, and the wiring (route, menu entries for buyers only, print rules).
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };

const a = html.indexOf('// BEGIN ANALYTICS HELPERS'), b = html.indexOf('// END ANALYTICS HELPERS');
check('the helper block is in index.html', a > 0 && b > a);
const H = new Function(html.slice(a, b) + '; return { spendPreset, spendRangeError, csvCell, buildSpendingCsv, spendMonthLabel, spendDayLabel, spendBars, spendItemKey, lastPaidOf };')();

// ---- periods ----
check('quick periods end today: this month, 3 months, this year, 12 months', JSON.stringify(H.spendPreset('month', '2026-10-08')) === '{"from":"2026-10-01","to":"2026-10-08"}' && H.spendPreset('3m', '2026-10-08').from === '2026-08-01' && H.spendPreset('year', '2026-10-08').from === '2026-01-01' && H.spendPreset('12m', '2026-10-08').from === '2025-11-01');
check('...also across a year boundary (3 months from February, 12 months from February)', H.spendPreset('3m', '2026-02-15').from === '2025-12-01' && H.spendPreset('12m', '2026-02-15').from === '2025-03-01' && H.spendPreset('3m', '2026-01-03').from === '2025-11-01');
check('period errors: missing / impossible dates, start after end, more than 5 years; exactly 5 years is fine', H.spendRangeError('', '2026-10-01') === 'spBadDate' && H.spendRangeError('2026-02-30', '2026-10-01') === 'spBadDate' && H.spendRangeError('2026-10-02', '2026-10-01') === 'spBadRange' && H.spendRangeError('2020-01-01', '2026-10-01') === 'spTooLong' && H.spendRangeError('2021-10-08', '2026-10-08') === null && H.spendRangeError('2026-10-01', '2026-10-01') === null);

// ---- CSV ----
check('text cells that a spreadsheet could run as a formula get an apostrophe: = + - @ tab return', ['=SUM(A1)', '+1', '-2', '@x', '\tcmd', '\rcmd'].every((v) => H.csvCell(v, false).startsWith("'") || H.csvCell(v, false).startsWith('"\'')), ['=SUM(A1)', '+1', '-2', '@x'].map((v) => H.csvCell(v, false)));
check('numbers stay numbers: no apostrophe, no quotes, also negative and zero amounts', H.csvCell('12.500', true) === '12.500' && H.csvCell('-3.250', true) === '-3.250' && H.csvCell('0.000', true) === '0.000' && H.csvCell(10, true) === '10');
check('a "number" column that is not a number is treated as text (and guarded)', H.csvCell('=1+1', true) === "'=1+1");
check('quoting: commas, quotes, semicolons, line breaks; empty and missing stay empty', H.csvCell('a,b', false) === '"a,b"' && H.csvCell('say "hi"', false) === '"say ""hi"""' && H.csvCell('a;b', false) === '"a;b"' && H.csvCell('a\nb', false) === '"a\nb"' && H.csvCell(null, false) === '' && H.csvCell('', true) === '');
const tr = (k) => ({ csvDate: 'Date', csvLpo: 'LPO', csvSupplier: 'Supplier', csvItem: 'Item', csvCategory: 'Category', csvQty: 'Qty', csvUnit: 'Unit', csvUnitPrice: 'Unit price', csvTotal: 'Total', csvPaid: 'Paid', csvInvoice: 'Invoice' }[k] || k);
const csv = H.buildSpendingCsv([
  { receivedDay: '2026-10-01', lpoId: 'abcdef-1234', supplier: '=HYPERLINK("http://x")', title: 'Olive oil, 5L', category: 'Restaurants & Café', quantity: 5, unit: 'box', unitPrice: '20.025', total: '100.125', paid: '100.125', invoiceStatus: 'PAID' },
  { receivedDay: '2026-10-02', lpoId: 'zzzz9999', supplier: 'Plain Co', title: '-5 kg flour', category: null, quantity: 100, unit: null, unitPrice: null, total: '200.000', paid: '0.000', invoiceStatus: null },
], tr, (s) => s.toLowerCase());
const rows = csv.replace(/^﻿/, '').split('\r\n');
check('CSV: byte-order mark (Excel reads Arabic), a header row, one row per order, CRLF lines, a final line break', csv.charCodeAt(0) === 0xFEFF && rows.length === 4 && rows[3] === '' && rows[0] === 'Date,LPO,Supplier,Item,Category,Qty,Unit,Unit price,Total,Paid,Invoice', rows[0]);
check('CSV: the LPO number as the app shows it; a formula in the supplier name is neutralized; amounts and quantity are bare numbers', rows[1].startsWith("2026-10-01,LPO-1234,\"'=HYPERLINK(\"\"http://x\"\")\",\"Olive oil, 5L\",") && rows[1].endsWith(',5,box,20.025,100.125,100.125,paid') && rows[2].includes(",'-5 kg flour,") && rows[2].endsWith(',100,,,200.000,0.000,'), rows.slice(1, 3));

// ---- labels and bars ----
check('month label in English and in Arabic (Latin digits)', /Oct/.test(H.spendMonthLabel('2026-10', 'en-GB')) && /26/.test(H.spendMonthLabel('2026-10', 'en-GB')) && /[؀-ۿ]/.test(H.spendMonthLabel('2026-10', 'ar-BH-u-nu-latn')) && /26/.test(H.spendMonthLabel('2026-10', 'ar-BH-u-nu-latn')) && !/[٠-٩]/.test(H.spendMonthLabel('2026-10', 'ar-BH-u-nu-latn')), [H.spendMonthLabel('2026-10', 'en-GB'), H.spendMonthLabel('2026-10', 'ar-BH-u-nu-latn')]);
check('a day label does not slip to the neighbouring day', H.spendDayLabel('2026-10-01', 'en-GB') === '01/10/2026');
const bars = H.spendBars([{ month: '2026-08', received: '0.000' }, { month: '2026-09', received: '50.000' }, { month: '2026-10', received: '100.000' }], 300, 150);
check('chart bars: the biggest month is full height, half is half, an empty month has no height; bars sit on a common baseline', bars[2].h === 150 && bars[1].h === 75 && bars[0].h === 0 && bars.every((x) => Math.abs(x.y + x.h - 150) < 0.11) && bars[0].x < bars[1].x && bars[1].x < bars[2].x, bars);
check('chart bars: all-zero months do not divide by zero', H.spendBars([{ month: '2026-10', received: '0.000' }], 300, 150)[0].h === 0 && H.spendBars([], 300, 150).length === 0);

// ---- "last paid" in Compare bids ----
check('item key = the server rule: same name + unit, capitals and extra spaces ignored, nothing else', H.spendItemKey('  Olive  OIL 5L ', 'Box') === 'olive oil 5l|box' && H.spendItemKey('Flour', null) === 'flour|' && H.spendItemKey('Olive oil 5L', 'box') !== H.spendItemKey('Olive oil 5L', 'carton') && H.spendItemKey('Olive oil', 'box') !== H.spendItemKey('Olive oil 5L', 'box'));
const detail = { rfqs: [
  { rfqId: 'r-now', day: '2026-10-01', unit: 'box', chosenUnitPrice: '19.000', bids: [{ supplier: 'Now Co', chosen: true }] },
  { rfqId: 'r-open', day: '2026-09-15', unit: 'box', chosenUnitPrice: null, bids: [{ supplier: 'Open Co', chosen: false }] },
  { rfqId: 'r-old', day: '2026-08-12', unit: 'box', chosenUnitPrice: '21.000', bids: [{ supplier: 'Old Co', chosen: false }, { supplier: 'Paid Co', chosen: true }] },
  { rfqId: 'r-older', day: '2026-06-10', unit: 'box', chosenUnitPrice: '20.000', bids: [{ supplier: 'Older Co', chosen: true }] },
] };
check('last paid: the newest earlier request that has a chosen bid, never the request being compared and never one without a choice', JSON.stringify(H.lastPaidOf(detail, 'r-now')) === '{"unitPrice":"21.000","supplier":"Paid Co","day":"2026-08-12","unit":"box"}', H.lastPaidOf(detail, 'r-now'));
check('last paid: nothing when there is no earlier purchase (or no history at all)', H.lastPaidOf({ rfqs: [detail.rfqs[0]] }, 'r-now') === null && H.lastPaidOf({ rfqs: [] }, 'x') === null && H.lastPaidOf(null, 'x') === null && H.lastPaidOf({}, 'x') === null);
const cmpSrc = html.slice(html.indexOf('async function openCompare'), html.indexOf('async function refreshCompareQuotes'));
check('Compare bids asks for the history after the bids are in, only as a hint (a failure shows nothing), and forgets it on close', cmpSrc.includes('loadLastPaid(rfqId);') && html.includes('/* no history yet, or offline: no hint */') && html.includes('compareLastPaid:null }); }') && html.includes("api('/api/analytics/items/detail?key=' + encodeURIComponent(spendItemKey(r.title, r.unit)))"));
check('the line is only drawn when there is a last price, and its values are escaped', html.includes("(state.compareLastPaid ? '<div class=\"mt-3") && html.includes('supplier: esc(state.compareLastPaid.supplier)'));

// ---- texts: English and Arabic ----
const i0 = html.indexOf('const I18N = {'), i1 = html.indexOf('\n};\n', i0);
const I18N = new Function('return ' + html.slice(i0 + 'const I18N = '.length, i1 + 3))();
check('the two "last paid" texts exist in both languages with their {placeholders}', ['cmpLastPaid', 'cmpLastPaidNoUnit'].every((k) => k in I18N.en && k in I18N.ar && /{price}/.test(I18N.en[k]) && /{price}/.test(I18N.ar[k]) && /{supplier}/.test(I18N.ar[k]) && /{date}/.test(I18N.ar[k])));
const mine = (k) => /^(navSpending|sp[A-Z]|csv[A-Z]|pr[A-Z]|cmp[A-Z])/.test(k);
const enKeys = Object.keys(I18N.en).filter(mine), arKeys = Object.keys(I18N.ar).filter(mine);
check('every new text exists in English and in Arabic, and nowhere else', enKeys.length > 60 && enKeys.join() === arKeys.slice().sort((x, y) => enKeys.indexOf(x) - enKeys.indexOf(y)).join() && arKeys.length === enKeys.length, enKeys.filter((k) => !(k in I18N.ar)).concat(arKeys.filter((k) => !(k in I18N.en))));
const ph = (s) => (String(s).match(/\{[a-zA-Z]+\}/g) || []).sort().join();
check('...with the same {placeholders} in both languages', enKeys.every((k) => ph(I18N.en[k]) === ph(I18N.ar[k])), enKeys.filter((k) => ph(I18N.en[k]) !== ph(I18N.ar[k])));
const bare = (s) => String(s).replace(/\{[a-zA-Z]+\}/g, '');
check('...and the Arabic texts are Arabic script (a text made only of placeholders excepted)', arKeys.every((k) => /[؀-ۿ]/.test(I18N.ar[k]) || !/[A-Za-z؀-ۿ]/.test(bare(I18N.ar[k]))), arKeys.filter((k) => !/[؀-ۿ]/.test(I18N.ar[k]) && /[A-Za-z؀-ۿ]/.test(bare(I18N.ar[k]))));
const block = html.slice(html.indexOf('// ---------- Buyer: spending and price history'), html.indexOf('function renderStockPage(){'));
const used = new Set([...block.matchAll(/\b(?:t|tpl)\('([A-Za-z0-9]+)'/g)].map((m) => m[1]).concat([...block.matchAll(/'(sp[A-Z][A-Za-z]+)'/g)].map((m) => m[1])));
check('every text the new screens ask for exists in both languages', [...used].every((k) => k in I18N.en && k in I18N.ar), [...used].filter((k) => !(k in I18N.en && k in I18N.ar)));
check('user-supplied values in the new screens are escaped (supplier, item, category, search)', /esc\(x\.name\)/.test(block) && /esc\(x\.title\)/.test(block) && /esc\(it\.title\)/.test(block) && /esc\(b\.supplier\)/.test(block) && /esc\(state\.priceSearch\)/.test(block) && /esc\(d\.title\.trim\(\)\)/.test(block));

// ---- wiring ----
check('route #/spending: known to the router, has its own address, and a supplier is sent Home', /spending: 'spending'/.test(html) && /spending: '#\/spending'/.test(html) && /r\.section === 'stock' \|\| r\.section === 'spending'\) && supplier\) r = \{ section: 'main' \}/.test(html));
const nav = html.slice(html.indexOf('function navBar(role)'), html.indexOf('function activeOrderCount'));
check('desktop menu: a Spending tab for buyers only', /isBuyer\s*\? \[[^\]]*\]\s*,[^\n]*'spending'/.test(nav.replace(/\n\s*/g, ' ')) && nav.split("'spending'").length === 2);
const more = html.slice(html.indexOf('function moreSheet('), html.indexOf('function mobileBack('));
check('phone: Spending is in the "More" sheet for buyers only, and the bottom bar is unchanged', /\(isBuyer \? row\("setSection\('catalog'\)", t\('navNetwork'\)\) \+ row\("setSection\('spending'\)", t\('navSpending'\)\) : row\(/.test(more) && /\['main', 'main', t\('navHomeShort'\)\], \['rfqs', 'rfqs', t\('navRfqs'\)\], \['lpos', 'lpos', t\('navOrdersShort'\)\], \['stock', 'stock', t\('navStock'\)\], \['more', 'more', t\('navMoreShort'\)\]/.test(html));
check('the page is shown only to buyers (a supplier on that section gets its hub)', /state\.section === 'spending' \? \(isBuyer \? renderSpendingPage\(\) : renderSupplierHub\(\)\)/.test(html));
check('the numbers are loaded from the three analytics routes and nothing else is called', /api\('\/api\/analytics\/spending\?from='/.test(block) && /api\('\/api\/analytics\/items'/.test(block) && /api\('\/api\/analytics\/items\/detail\?key='/.test(block) && (block.match(/api\('/g) || []).length === 3);
check('print: controls, header, menus and sheets stay out of the printed report; a heading with the company and period is printed', /\.bx-noprint, \.bx-bottomnav, \.bx-more, \.bx-overlay \{ display: none !important; \}/.test(html) && /\.bx-printonly \{ display: block;/.test(html) && /<header class="bx-noprint sticky/.test(html) && /<div class="bx-noprint hidden md:block border-b"/.test(html) && /class="bx-printonly mb-4"/.test(block));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
