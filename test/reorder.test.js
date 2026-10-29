// Run: node test/reorder.test.js   (no dependencies)
// Reorder reminders in the cabinet: the Home card, "Order again" (the Re-order form with the usual quantity), snooze / turn off / turn on, the bell,
// #/reorder/<last order>. The server decides what is due and who may see prices; these checks keep the screens honest.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); };
const has = (s) => html.includes(s);

// ---- the pure parts and the card, extracted from index.html
const perms = { list: ['rfq.draft'] };
const state = { view: 'buyer', lang: 'en', reorder: null, reorderAll: false, token: 't', orders: [] };
const can = (a) => perms.list.includes(a);
const t = (k) => '[' + k + ']';
const tpl = (k, v) => '[' + k + ':' + Object.entries(v).map(([a, b]) => a + '=' + b).join(',') + ']';
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const unitLabel = (u) => u, fmtQty = (n) => String(n), bhdMoney = (n) => n + ' BHD', categoryLabel = (c) => c || '—';
const reorders = [], toasts = [];
const openReorder = (o) => reorders.push(o);
const showToast = (m) => toasts.push(m);
const src = html.slice(html.indexOf('function reorderItem(key){'), html.indexOf('async function openReorderLink(orderId){'))
  + html.slice(html.indexOf('const REORDER_HOME_ROWS = 5;'), html.indexOf('function renderBuyerHub(){'));
const lib = new Function('state', 'can', 't', 'tpl', 'esc', 'unitLabel', 'fmtQty', 'bhdMoney', 'categoryLabel', 'openReorder', 'showToast', 'setState', 'api', 'refreshReorder', 'confirm',
  src + '; return { reorderItem, orderAgainItem, reorderDueText, reorderCard, reorderOffCard, toggleReorderAll };')(state, can, t, tpl, esc, unitLabel, fmtQty, bhdMoney, categoryLabel, openReorder, showToast, (p) => Object.assign(state, p), async () => ({}), async () => {}, () => true);

const item = (n, extra) => ({ key: 'item' + n + '|kg', title: 'Item ' + n, unit: 'kg', brand: 'Acme', category: 'Restaurants & Cafés', productId: 'p' + n, usualQuantity: 20, intervalDays: 21, orders: 3, expectedDate: '2026-10-20', daysLeft: 2,
  lastOrderId: 'o' + n, cycle: 'l' + n, lastOrderDate: '2026-09-29', lastQuantity: 30, lastSupplier: 'Fresh Dairy', lastUnitPrice: '2.500', ...extra });

check('due text: today, tomorrow, in N days, yesterday, N days ago', lib.reorderDueText(0) === '[rdDueToday]' && lib.reorderDueText(1) === '[rdDueTomorrow]' && lib.reorderDueText(5) === '[rdDueIn:n=5]' && lib.reorderDueText(-1) === '[rdLateYesterday]' && lib.reorderDueText(-4) === '[rdLate:n=4]');
check('no card without data, without items, for a supplier, or without the right to prepare a request', lib.reorderCard() === '' && (state.reorder = { items: [], muted: [], showPrices: true }, lib.reorderCard() === '') &&
  (state.reorder = { items: [item(1)], muted: [], showPrices: true }, state.view = 'supplier', lib.reorderCard() === '') && (state.view = 'buyer', perms.list = [], lib.reorderCard() === ''));
perms.list = ['rfq.draft'];
let card = lib.reorderCard();
check('the card: title, usual interval and quantity, last quantity and supplier, the price when the server sent it, and the three actions', card.includes('Item 1') && card.includes('[rdUsually:days=21]') && card.includes('[rdUsualQty:qty=20,unit=kg]') && card.includes('[rdLast:qty=30,unit=kg,supplier=Fresh Dairy]') && card.includes('[rdPrice:price=2.500 BHD]') && card.includes('[rdOrderAgain]') && card.includes('[rdSnooze]'));
check('...turning off is for Manager and up only (staff get Order again and Snooze)', !card.includes('[rdMute]') && (perms.list = ['rfq.draft', 'reorder.mute'], lib.reorderCard().includes('[rdMute]')));
perms.list = ['rfq.draft'];
state.reorder = { items: [item(1, { lastUnitPrice: undefined })], muted: [], showPrices: false };
check('no price when the server sent none (staff): not even a placeholder', !lib.reorderCard().includes('rdPrice') && !/BHD/.test(lib.reorderCard()));
state.reorder = { items: [item(1, { title: '<b>x</b> & "y"', lastSupplier: '<i>s</i>', key: "o'brien|kg" })], muted: [], showPrices: true };
card = lib.reorderCard();
check('text from users is escaped, and a quote in the key cannot break the button', !card.includes('<b>x</b>') && !card.includes('<i>s</i>') && card.includes('&lt;b&gt;x&lt;/b&gt;') && !/orderAgainItem\('o'brien/.test(card) && card.includes('o&#39;brien|kg'));
state.reorder = { items: [1, 2, 3, 4, 5, 6, 7].map((n) => item(n)), muted: [], showPrices: true };
check('more than 5 items: 5 rows and "Show all (7)"; the button shows them all and then "Show less"', (lib.reorderCard().match(/rdOrderAgain/g) || []).length === 5 && lib.reorderCard().includes('[rdShowAll:n=7]') && (lib.toggleReorderAll(), (lib.reorderCard().match(/rdOrderAgain/g) || []).length === 7 && lib.reorderCard().includes('[rdShowLess]')) && (lib.toggleReorderAll(), true));

// Order again = the Re-order form, with the usual quantity (not the last one)
state.reorder = { items: [item(1)], muted: [], showPrices: true };
lib.orderAgainItem('item1|kg');
check('"Order again" opens the request form like Re-order: title, unit, brand, product and category of the item, with the usual quantity (20, not the last 30)', reorders.length === 1 && reorders[0].title === 'Item 1' && reorders[0].unit === 'kg' && reorders[0].brand === 'Acme' && reorders[0].productId === 'p1' && reorders[0].quantity === 20 && reorders[0].category === 'Restaurants & Cafés');
lib.orderAgainItem('gone|kg');
check('...an item that is no longer on the list says so and opens nothing', reorders.length === 1 && toasts[toasts.length - 1] === '[rdGone]');

// turned-off list in Settings
state.reorder = { items: [], muted: [{ key: 'tea|kg', label: 'Tea (kg)' }], showPrices: true };
check('Settings lists the items that are off with "Turn on" for Manager and up; nothing for staff or when none is off', lib.reorderOffCard() === '' && (perms.list = ['rfq.draft', 'reorder.mute'], lib.reorderOffCard().includes('Tea (kg)') && lib.reorderOffCard().includes('[rdTurnOn]') && lib.reorderOffCard().includes("unmuteReorder(")) && (state.reorder.muted = [], lib.reorderOffCard() === ''));

// ---- wiring
check('the data comes from GET /reorder/suggestions, for buyers who may prepare a request; refreshed with everything else and on Home polls; forgotten at sign-out', has("api('/api/reorder/suggestions')") && has("if (!state.token || state.view !== 'buyer' || !can('rfq.draft')) return;\n  try { const d = await api('/api/reorder/suggestions')") && has('refreshRatings(), refreshReorder() ]);') && has("if (state.section === 'main') refreshReorder();") && has('return { reorder:null, reorderAll:false,'));
check('snooze, turn off and turn on call the three POST routes with the item key', has("reorderAction('snooze', key, 'rdSnoozed')") && has("reorderAction('mute', key, 'rdMuted')") && has("reorderAction('unmute', key, 'rdUnmuted')") && has("'/api/reorder/' + path, { method:'POST', body: JSON.stringify({ key }) }"));
check('turning off asks first (it is for the whole company)', has("if (!confirm(tpl('rdMuteConfirm'"));
check('the card sits on Home under the "needs attention" block; the turned-off list in Settings', has("attentionBlock() + reorderCard() +") && has('  reorderOffCard() +\n  peopleCard() +'));
check('the bell: a reorder reminder opens "Order again" for that item and a "more" note opens Home; both mark the notification read', has("n.type === 'REORDER_DUE' && n.relatedOrderId && can('rfq.draft')") && has('openNotifReorder(\\\'') && has('openNotifReorderMore(\\\'') && has("t('rdOrderAgain') + '</div>'") && has("t('rdSeeAll')") && has('function openNotifReorder(orderId, notifId){') && has('function openNotifReorderMore(notifId){'));
check('#/reorder/<last order> (e-mail and bell): known route, parsed, applied for buyers who may prepare a request (others land on Home), waits for sign-in when signed out', has("m[1] === 'reorder' && m[2]) return { section: 'reorderLink'") && has("['order', 'rfq', 'approval', 'reorder', 'login', 'register']") && has("if (r.section === 'reorderLink' && r.orderId) { if (!supplier && can('rfq.draft')) openReorderLink(r.orderId); else setSection('main'); return; }") && has("r.section === 'approvalLink' || r.section === 'reorderLink') openAuth('BUYER', 'login')"));
check('...the link finds the item by its last order; if the reminder is gone it falls back to the plain Re-order of that order, else says so', has("find(i => i.lastOrderId === orderId)") && has('reorderFromOrder(orderId); else showToast(t(\'rdGone\'))'));

// the route parser, extracted
const ROUTE_NAMES = { '': 'main' };
const safeDecode = (v) => { try { return decodeURIComponent(v); } catch (e) { return v; } };
const ph = new Function('ROUTE_NAMES', 'safeDecode', html.slice(html.indexOf('function parseHash(h){'), html.indexOf('function isKnownRoute(h)')) + '; return parseHash;')(ROUTE_NAMES, safeDecode);
check('parseHash: #/reorder/<id> -> reorderLink with the id; #/reorder alone is just Home', ph('#/reorder/abc-123').section === 'reorderLink' && ph('#/reorder/abc-123').orderId === 'abc-123' && ph('#/reorder').section === 'main');

// ---- texts in both languages
const en = html.slice(html.indexOf('en: {'), html.indexOf('ar: {')), ar = html.slice(html.indexOf('ar: {'));
const val = (b, k) => { const m = new RegExp('\\b' + k + ':\\s*"((?:[^"\\\\]|\\\\.)*)"').exec(b); return m ? m[1] : ''; };
const phs = (x) => (x.match(/\{\w+\}/g) || []).sort().join(',');
const keys = [...new Set([...en.matchAll(/\b(rd[A-Z]\w*):/g)].map((m) => m[1]))];
check('every reorder text exists in English and Arabic with Arabic script and the same placeholders', keys.length >= 25 && keys.every((k) => val(en, k) && /[؀-ۿ]/.test(val(ar, k)) && phs(val(en, k)) === phs(val(ar, k))), keys.filter((k) => !(val(en, k) && /[؀-ۿ]/.test(val(ar, k)) && phs(val(en, k)) === phs(val(ar, k)))));
check('every key used with t() / tpl() in the reorder code exists in both languages', (() => {
  const code = html.slice(html.indexOf('// ---------- Reorder reminders'), html.indexOf('function renderBuyerHub(){'));
  const used = [...new Set([...code.matchAll(/\b(?:t|tpl)\('(rd\w+)'/g)].map((m) => m[1]))];
  return used.length >= 15 && used.every((k) => val(en, k) && val(ar, k));
})());
check('the glossary: "Order again" in Arabic reuses the app\'s word for Re-order', /إعادة الطلب/.test(val(ar, 'rdOrderAgain')) && ar.includes("reorder:'إعادة الطلب'"));

// ---- server errors of the new routes have Arabic
const se = fs.readFileSync(path.join(__dirname, '..', 'server-errors.js'), 'utf8');
const win = {}; new Function('window', se)(win);
check('server-errors.js: "key is required" and "Item not found" have Arabic (display only)', /[؀-ۿ]/.test(win.serverError('key is required', 'ar')) && /[؀-ۿ]/.test(win.serverError('Item not found', 'ar')) && win.serverError('Item not found', 'en') === 'Item not found');

// ---- mobile (375 px): the actions wrap, are at least 44px tall, long names break instead of overflowing
const rows = html.slice(html.indexOf('function reorderCard(){'), html.indexOf('// Settings: the items turned off'));
check('mobile: actions wrap (flex-wrap), each is at least 44px tall, long titles and suppliers break (overflow-wrap:anywhere)', /flex flex-wrap items-center gap-2/.test(rows) && (rows.match(/min-h-\[44px\]/g) || []).length >= 4 && /overflow-wrap:anywhere/.test(rows));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
