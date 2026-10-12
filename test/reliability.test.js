// Run: node test/reliability.test.js   (no dependencies)
// Supplier reliability in the cabinet: Compare bids shows only positive badges (or "New supplier"), the supplier's card shows every figure
// that has data behind it, with explanations; the supplier sees its own. The server decides what is shown; these checks keep the screens honest.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); };
const has = (s) => html.includes(s);

// ---- the badge line, extracted from index.html
const t = (k) => '[' + k + ']';
const tpl = (k, v) => '[' + k + ':' + Object.entries(v).map(([a, b]) => a + '=' + b).join(',') + ']';
const esc = (s) => String(s == null ? '' : s);
const src = html.slice(html.indexOf('function supplierRatingLine(r, supplierId){'), html.indexOf('// The supplier\'s card (GET /suppliers'));
const { supplierRatingLine } = new Function('t', 'tpl', 'esc', src + '; return { supplierRatingLine };')(t, tpl, esc);

const none = supplierRatingLine(null);
check('not enough data: "New supplier", never a score', none.includes('[rtNew]') && !/rtOrders|rtNoClaims|rtOnTime|★/.test(none));
const full = supplierRatingLine({ orders: 9, completedOrders: 9, claimFreePercent: 88, reviews: 7, avgStars: 4.6, onTimePercent: 85, matchesOrderPercent: 85 });
check('enough data: stars, orders, no problems, on time, as ordered — and nothing else', full.includes('★ 4.6') && full.includes('[rtOrders:n=9]') && full.includes('[rtNoClaims:p=88]') && full.includes('[rtOnTime:p=85]') && full.includes('[rtAsOrdered:p=85]'));
const noReviews = supplierRatingLine({ orders: 6, completedOrders: 6, claimFreePercent: 100 });
check('without enough reviews only the orders badges show (no stars, no on-time)', noReviews.includes('[rtOrders:n=6]') && !noReviews.includes('★') && !noReviews.includes('rtOnTime') && !noReviews.includes('rtAsOrdered'));
check('the badge line never mentions declines, disputes or failures (those are on the card only)', !/declin|dispute|fail/i.test(full + noReviews + none));

// ---- wiring
check('Compare bids: the line is shown for buyers only (the key supplierRating exists), and the name opens the card', has("('supplierRating' in x ? supplierRatingLine(x.supplierRating) : '')") && has("'supplierRating' in x ? '<button type=\"button\" onclick=\"openSupplierCard("));
check('the card loads GET /suppliers/:id/reliability and sits on top of the other windows; it has its place in the history of windows', has("'/api/suppliers/' + encodeURIComponent(id) + '/reliability'") && has('renderApprovalModal() + renderSupplierCard()') && has("['supplierCard', s => !!s.supplierCard, () => closeSupplierCard()]"));
check('the card shows every group with its base and an explanation; a group without data says so; a new supplier gets one message', ['rlDisputesHint', 'rlDeclinedHint', 'rlFailedHint', 'rlNoProblemsHint', 'rlNotEnough', 'rlNew'].every((k) => has("t('" + k + "')") || has("tpl('" + k + "'")) && has('d.newSupplier'));
check('the supplier\'s own card shows every figure and the rule (needed orders and buyers)', has("cell(t('rpDisputes')") && has("cell(t('rpDeclined')") && has("cell(t('rpFailed')") && has("tpl('rpRule', { n: f.minOrders, m: f.minBuyers })"));

// ---- texts in both languages
const en = html.slice(html.indexOf('en: {'), html.indexOf('ar: {')), ar = html.slice(html.indexOf('ar: {'));
const val = (b, k) => { const m = new RegExp('\\b' + k + ':\\s*"((?:[^"\\\\]|\\\\.)*)"').exec(b); return m ? m[1] : ''; };
const ph = (x) => (x.match(/\{\w+\}/g) || []).sort().join(',');
const keys = [...new Set([...en.matchAll(/\b((?:rl[A-Z]|rp(?:Completed|AsOrdered|Disputes|Declined|Failed|Window|Rule))\w*|rtNew|rtAsOrdered|rtDetails|rtNoClaims|rtHint):/g)].map((m) => m[1]))];
check('every new text exists in English and Arabic with Arabic script and the same placeholders', keys.length >= 28 && keys.every((k) => val(en, k) && /[؀-ۿ]/.test(val(ar, k)) && ph(val(en, k)) === ph(val(ar, k))));
check('the explanations say what the agreed compromise needs: a dispute is not always the supplier\'s fault; a decline can mean out of stock; a failed delivery is a failed attempt', /not always the supplier/.test(val(en, 'rlDisputesHint')) && /out of stock/.test(val(en, 'rlDeclinedHint')) && /attempt/.test(val(en, 'rlFailedHint')));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
