// Run: node test/supplier-analytics.test.js   (no dependencies)
// The supplier's "Analytics" section of index.html: wiring (sidebar and "More" for suppliers only, the bottom bar untouched, the
// route), the texts in English and Arabic (with the "?" hints), and the screens drawn from sample answers.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };

const i0 = html.indexOf('const I18N = {'), i1 = html.indexOf('\n};\n', i0);
const I18N = new Function('return ' + html.slice(i0 + 'const I18N = '.length, i1 + 3))();

// ---- texts ----
const mine = (k) => /^(navAnalytics|sna[A-Z]|hint_sna_)/.test(k);
const enKeys = Object.keys(I18N.en).filter(mine), arKeys = Object.keys(I18N.ar).filter(mine);
check('every analytics text exists in English and in Arabic, and nowhere else', enKeys.length > 60 && enKeys.slice().sort().join() === arKeys.slice().sort().join(), { en: enKeys.length, ar: arKeys.length });
const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join();
check('the {placeholders} are the same in both languages', enKeys.every((k) => ph(I18N.en[k]) === ph(I18N.ar[k])), enKeys.filter((k) => ph(I18N.en[k]) !== ph(I18N.ar[k])));
check('the Arabic texts are written in Arabic', arKeys.every((k) => /[؀-ۿ]/.test(I18N.ar[k])), arKeys.filter((k) => !/[؀-ۿ]/.test(I18N.ar[k])));
check('the "?" hints exist for win rate, response rate and the other terms, in both languages', ['received', 'responseRate', 'winRate', 'responseTime', 'wins', 'delivered', 'rating', 'repeat', 'interval', 'gaps', 'trending', 'busiest', 'enough']
  .every((k) => I18N.en['hint_sna_' + k] && I18N.ar['hint_sna_' + k]));

// ---- wiring ----
const between = (a, b) => html.slice(html.indexOf(a), html.indexOf(b, html.indexOf(a)));
const nav = between('function bottomNav(role){', 'function toggleMoreSheet');
check('the bottom bar is unchanged: Analytics is not one of its tabs', !nav.includes('supAnalytics'));
const more = between('function moreSheet(role, walletLabel){', 'function mobileBack');
check('"More" has Analytics for suppliers only (in the supplier branch, next to the wallet)', /openWalletModal\(\)[^\n]*row\("setSection\('supAnalytics'\)", t\('navAnalytics'\)\)\) \+/.test(more) && (more.match(/supAnalytics/g) || []).length === 1);
const bar = between('function navBar(role){', 'function activeOrderCount') || '';
check('the desktop menu has Analytics in the supplier list only', /: \[ \['main',t\('navSupplierHub'\)\][^\n]*\['supAnalytics',t\('navAnalytics'\)\]/.test(bar) && (bar.match(/supAnalytics/g) || []).length === 1);
check('route #/analytics -> the section; a buyer who opens it lands on Home', html.includes("analytics: 'supAnalytics'") && html.includes("supAnalytics: '#/analytics'") && html.includes("if (r.section === 'supAnalytics' && !supplier) r = { section: 'main' };"));
check('the section loads its numbers when a supplier opens it, and a buyer never gets the screen', html.includes("if (sec === 'supAnalytics' && state.view === 'supplier')") && html.includes("state.section === 'supAnalytics' ? (isBuyer ? renderBuyerHub() : renderSupplierAnalytics())"));

// ---- screens ----
const block = between('// ---------- Supplier: analytics (#/analytics) ----------', '// ---------- Buyer: spending and price history');
const state = { lang: 'en', snaTab: 'performance', snaPeriod: '3m', snaData: { performance: null, demand: null, customers: null }, snaLoading: false };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const make = (lang) => new Function('state', 'esc', 'I18N', 'lang', `
  const t = (k) => (I18N[lang][k] != null ? I18N[lang][k] : k);
  const tpl = (k, v) => t(k).replace(/\\{(\\w+)\\}/g, (m, x) => v && v[x] != null ? v[x] : m);
  const hint = (k) => '<hint:' + k + '>';
  const fmtNum = (n, d) => (Number(n) || 0).toFixed(d == null ? 3 : d);
  const spendMoney = (v) => 'BHD ' + v;
  const spendMonthLabel = (m) => m; const spendDayLabel = (d) => d; const spLocale = () => 'en-GB';
  const SPEND_BAHRAIN_OFFSET_MS = 3 * 3600e3;
  const emptyState = (a, b) => '<empty>' + a + '|' + b + '</empty>';
  const setState = () => {}; const api = async () => ({}); const showToast = () => {};
  ${block}
  return { renderSupplierAnalytics, snaDuration };`)(state, esc, I18N, lang);
const S = make('en');
check('durations: minutes, hours, days', S.snaDuration(45) === '45 min' && S.snaDuration(90) === '1 h 30 min' && S.snaDuration(1500) === '1 d 1 h' && S.snaDuration(null) === '–');

const perf = { rfqsReceived: 3, quotesSent: 3, responseRate: 67, ordersWon: 1, winRate: 33, avgResponseMinutes: 60, responseTimeBasedOn: 2, wonValue: '20.000', deliveredOrders: 1, deliveredValue: '20.000',
  rating: { reviews: 1, avgStars: 4, onTimePercent: 100, matchesOrderPercent: 0, byMonth: [{ month: '2026-10', reviews: 1, avgStars: 4, onTimePercent: 100, matchesOrderPercent: 0 }, { month: '2026-09', reviews: 0, avgStars: null, onTimePercent: null, matchesOrderPercent: null }] } };
state.snaData.performance = perf;
let out = S.renderSupplierAnalytics();
check('performance: the numbers, 3-decimal money, and a "?" on win rate and response rate', /67%/.test(out) && /33%/.test(out) && /1 h/.test(out) && /BHD 20\.000/.test(out) && out.includes('<hint:sna_winRate>') && out.includes('<hint:sna_responseRate>'));
check('performance: the rating trend lists only months with reviews', /2026-10/.test(out) && !/2026-09/.test(out));
state.snaData.performance = { ...perf, rfqsReceived: 0, quotesSent: 0, responseRate: null, winRate: null, avgResponseMinutes: null, responseTimeBasedOn: 0, rating: { reviews: 0, byMonth: [] } };
out = S.renderSupplierAnalytics();
check('performance with nothing yet: dashes and "Not enough data yet", no "NaN" or "null"', !/NaN|null|undefined/.test(out) && out.includes('Not enough data yet'));

state.snaTab = 'demand'; state.snaData.demand = { enough: false, minRfqs: 5, minBuyers: 3 };
out = S.renderSupplierAnalytics();
check('demand below the threshold: "Not enough data yet" and nothing else (no items, no charts)', out.includes('<empty>Not enough data yet') && !/snaTopItems|Most requested/.test(out) && out.includes('<hint:sna_enough>'));
state.snaData.demand = { enough: true, topItems: [{ title: '<img src=x onerror=1>', unit: 'kg', requests: 4 }], trending: [{ title: 'Milk', unit: 'l', requests: 3, previous: 1, changePercent: 200 }, { title: 'Rice', unit: 'kg', requests: 2, previous: 0, changePercent: null }],
  catalogGaps: [{ title: 'Flour', unit: 'kg', requests: 2 }], busiest: { weekdays: [0, 3, 1, 0, 0, 0, 2], hours: Array.from({ length: 24 }, (_, i) => (i === 9 ? 5 : 0)) } };
out = S.renderSupplierAnalytics();
check('demand: top, trending (+200% / new), gaps, busiest days and 24 hours; item titles are escaped', /\+200%/.test(out) && /new/.test(out) && /Flour/.test(out) && !out.includes('<img src=x') && out.includes('&lt;img') && out.includes('<hint:sna_gaps>') && out.includes('<hint:sna_busiest>') && (out.match(/title="\d+: \d+"/g) || []).length === 24, out.length);
state.snaData.demand = { enough: true, topItems: [], trending: [], catalogGaps: [], busiest: { weekdays: [0, 0, 0, 0, 0, 0, 0], hours: Array(24).fill(0) } };
check('demand with empty lists draws without errors (no gaps message)', S.renderSupplierAnalytics().includes('No gaps'));

state.snaTab = 'customers'; state.snaData.customers = { totalCustomers: 2, repeatCustomers: 1, typicalIntervalDays: 10, truncated: false,
  customers: [{ name: 'Alpha <b>Buyer</b>', orders: 3, value: '30.000', lastOrderAt: '2026-10-30T22:30:00.000Z', typicalIntervalDays: 10, topItems: [{ title: 'Milk', unit: 'kg', orders: 3 }] }, { name: 'Beta', orders: 1, value: '4.250', lastOrderAt: '2026-10-01T10:00:00.000Z', typicalIntervalDays: null, topItems: [] }] };
out = S.renderSupplierAnalytics();
check('customers: totals, the two customers with value, interval and top items; names are escaped; "?" on repeat customers', /Alpha &lt;b&gt;Buyer/.test(out) && /BHD 30\.000/.test(out) && /2026-10-31/.test(out) && /about every 10\.0 days/.test(out) && /Milk ×3/.test(out) && out.includes('<hint:sna_repeat>') && !out.includes('<b>Buyer'));
state.snaData.customers = { totalCustomers: 0, repeatCustomers: 0, typicalIntervalDays: null, customers: [], truncated: false };
check('customers with no orders: an empty state', S.renderSupplierAnalytics().includes('<empty>No orders in this period yet.'));

// the same screens in Arabic: no missing text keys (a missing key would print its own name)
const SA = make('ar');
state.snaTab = 'performance'; state.snaData.performance = perf;
const outAr = SA.renderSupplierAnalytics();
check('Arabic: the performance screen has no untranslated key', !/\bsna[A-Z]\w*/.test(outAr) && /[؀-ۿ]/.test(outAr), outAr.match(/\bsna[A-Z]\w*/g));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
