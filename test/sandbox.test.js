// Run: node test/sandbox.test.js   (no dependencies)
// The admin's test mode in index.html: the helpers (profiles, the saved admin session, what the banner shows), the banner itself,
// the wiring (entering, leaving, sign-out inside the test mode, an ended test session), the admin tab, and the texts in both languages.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };
const has = (s) => html.includes(s);

const a = html.indexOf('// BEGIN SANDBOX HELPERS'), b = html.indexOf('// END SANDBOX HELPERS');
check('the helpers block is in index.html', a > 0 && b > a);
const lib = new Function(html.slice(a, b) + '; return { ADMIN_SESSION_KEY, sandboxProfiles, parseAdminSession, sandboxBannerModel };')();

// ---- profiles
const raw = [
  { id: 's2', name: 'Sandbox Supplier B', type: 'SUPPLIER', credits: '100.000' }, { id: 'b', name: 'Sandbox Buyer', type: 'BUYER' },
  { id: 's1', name: 'Sandbox Supplier A', type: 'SUPPLIER' }, { id: 5, name: 'bad id', type: 'BUYER' }, { id: 'x', name: 'odd type', type: 'ADMIN' }, null, { id: 'y' },
];
const prof = lib.sandboxProfiles(raw);
check('profiles: the buyer first, then the suppliers by name; malformed entries are dropped; only id, name and type are kept', prof.map((p) => p.id).join() === 'b,s1,s2' && prof.every((p) => Object.keys(p).sort().join() === 'id,name,type'), prof);
check('profiles: anything that is not a list gives an empty list', lib.sandboxProfiles(null).length === 0 && lib.sandboxProfiles('x').length === 0 && lib.sandboxProfiles(undefined).length === 0);

// ---- the saved admin session
const adminSess = JSON.stringify({ token: 'tok', user: { role: 'ADMIN', email: 'a@b' }, company: null, list: raw });
const parsed = lib.parseAdminSession(adminSess);
check('the admin session: read back with the token, the user and a clean list of test companies', parsed && parsed.token === 'tok' && parsed.user.role === 'ADMIN' && parsed.list.length === 3, parsed);
check('...but only an admin\'s: a buyer\'s or a test user\'s session, damaged text, nothing, or no token are not an admin session',
  lib.parseAdminSession(JSON.stringify({ token: 't', user: { role: 'BUYER' } })) === null && lib.parseAdminSession(JSON.stringify({ token: 't', user: { role: 'BUYER', sandbox: true } })) === null &&
  lib.parseAdminSession('{oops') === null && lib.parseAdminSession(null) === null && lib.parseAdminSession(JSON.stringify({ user: { role: 'ADMIN' } })) === null && lib.parseAdminSession(JSON.stringify({ token: '', user: { role: 'ADMIN' } })) === null);
check('the admin session has its own storage key, not the one of the ordinary session', lib.ADMIN_SESSION_KEY === 'biddex_admin_session' && lib.ADMIN_SESSION_KEY !== 'biddex_session' && has("localStorage.getItem('biddex_session')"));

// ---- what the banner shows
const co = { id: 's1', name: 'Sandbox Supplier A', type: 'SUPPLIER' };
check('no banner outside the test mode: an ordinary user, an admin, a missing company, or a flag that is not exactly true', lib.sandboxBannerModel({ role: 'BUYER' }, co, prof) === null && lib.sandboxBannerModel({ role: 'ADMIN' }, null, prof) === null && lib.sandboxBannerModel({ sandbox: true }, null, prof) === null && lib.sandboxBannerModel({ sandbox: 'yes' }, co, prof) === null && lib.sandboxBannerModel(null, co, prof) === null);
const m = lib.sandboxBannerModel({ sandbox: true }, co, prof);
check('the banner model: the company and its kind, all test companies to switch to, the current one marked', m.name === 'Sandbox Supplier A' && m.type === 'SUPPLIER' && m.options.length === 3 && m.options.filter((o) => o.selected).map((o) => o.id).join() === 's1');

// ---- the banner HTML (with the page's own t / tpl / esc)
const en = {}; const ar = {};
{
  const i = html.indexOf('const I18N = {');
  const end = html.indexOf('\n};', i);
  const I18N = new Function(html.slice(i, end + 3).replace('const I18N =', 'return') )();
  Object.assign(en, I18N.en); Object.assign(ar, I18N.ar);
}
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tpl = (k, v) => String(en[k]).replace(/\{(\w+)\}/g, (_, n) => (v[n] !== undefined ? v[n] : '{' + n + '}'));
const bannerSrc = html.slice(html.indexOf('function sandboxBanner(){'), html.indexOf('// the banner is sticky at the top'));
const banner = (user, company, list) => new Function('state', 't', 'tpl', 'esc', 'sandboxBannerModel', 'sandboxProfiles', bannerSrc + '; return sandboxBanner();')({ user, company, sandboxList: list }, (k) => en[k] || k, tpl, esc, lib.sandboxBannerModel, lib.sandboxProfiles);
const out = banner({ sandbox: true }, { id: 's1', name: 'Sandbox <b>A</b>', type: 'SUPPLIER' }, prof);
check('the banner says TEST MODE, names the company (escaped) and its kind, has a switch to the others and the way back', /TEST MODE/.test(out) && out.includes('Sandbox &lt;b&gt;A&lt;/b&gt;') && !out.includes('<b>A</b>') && /\(Supplier\)/.test(out) && out.includes('sandboxEnter(this.value)') && out.includes('onclick="sandboxExit()"') && out.includes('Back to admin'), out.slice(0, 300));
check('...the current company is the selected option, the others are listed with their kind', /<option value="s1" selected>/.test(out) && /<option value="b">Sandbox Buyer · Buyer<\/option>/.test(out));
check('...nothing for an ordinary user; no switch when there is nobody to switch to', banner({ role: 'BUYER' }, co, prof) === '' && !banner({ sandbox: true }, co, [co]).includes('<select'));
check('the banner is not printed and is a status region for screen readers', /class="bx-sbx bx-noprint" role="status"/.test(out));

// ---- wiring
check('only the server decides about the test mode: the app never sets user.sandbox itself', !/user\.sandbox\s*=[^=]/.test(html) && !/sandbox:\s*true/.test(html.replace(/\/\/ .*\n/g, '').replace(/['"]sandbox: true['"]/g, '')) );
check('entering: the switch is called with the ADMIN\'s token (the sandbox token cannot), then the answer becomes the session', has("state.token = admin.token; // the switch is the admin's call") && has("api('/api/admin/sandbox/switch', { method: 'POST', body: JSON.stringify({ companyId }) })") && has('state.token = data.token; state.user = data.user; state.company = data.company; saveSession();'));
check('entering from the admin console saves the admin\'s session first (not when switching between test companies: it is already saved)', has('if (!inSbx) saveAdminSession({ token: admin.token, user: admin.user, company: admin.company,'));
check('a failed switch changes nothing: the old token is put back and a toast says so', has('if (state.token === admin.token) state.token = keep;') && has("showToast(e.message || t('sbxSwitchFailed'))"));
check('the data of the previous company is dropped on every switch (the same reset as signing out)', has('setState({ ...signedOutState(), token: data.token,') && has('function signedOutState(){'));
check('leaving: the admin\'s session is put back, the test session dropped, and the admin lands on the Sandbox tab', has('clearAdminSession();') && has('state.token = s.token; state.user = s.user; state.company = s.company; saveSession();') && has("view: 'admin', adminTab: 'sandbox'"));
check('"Sign out" inside the test mode is "Back to admin"; without a saved admin session it signs out for real', has('if (isSandbox() && readAdminSession()) { sandboxExit(); return; }') && has('if (!s) { logout(); return; }'));
check('a test session that ends (401) puts the admin back with its own message instead of "session expired"', has('const wasSandbox = isSandbox();') && has("t(wasSandbox ? 'sbxEnded' :"));
check('after a reload the banner still knows the test companies (read from the saved admin session)', has('if (s.user && s.user.sandbox === true) { const a = readAdminSession(); state.sandboxList = a ? a.list : []; }'));
check('the banner is drawn on buyer and supplier screens, above the page, and the header is moved under it', has("state.view === 'buyer' || state.view === 'supplier' ? sandboxBanner() : ''") && has('app.innerHTML = sbx + (') && has('html[data-sbx] header.sticky { top: var(--sbx-h, 0px) !important; }') && has("document.documentElement.style.setProperty('--sbx-h'"));
check('the page title says TEST in the test mode and is restored after', has("document.title = (b ? 'TEST · ' : '') + base;"));
check('no "Delete my account" button in the test mode (the server refuses it as well)', has("(isSandbox() ? '' : '<button onclick=\"openEraseModal()\""));

// ---- the admin console
check('the admin console has a Sandbox tab, loaded when it is opened and after leaving the test mode', has("setAdminTab(\\'sandbox\\')") && has("state.adminTab === 'sandbox' ? renderAdminSandbox() :") && has("else if (tab === 'sandbox') refreshAdminSandbox();") && has('refreshAdmin(); refreshAdminSandbox();'));
check('the tab creates the test companies (POST setup) and enters one (sandboxEnter with the id as a text literal)', has("api('/api/admin/sandbox/setup', { method: 'POST' })") && has("'sandboxEnter(' + jsAttr(p.id) + ')'") && has("api('/api/admin/rfqs?sandbox=1&pageSize=50')"));
const tabSrc = html.slice(html.indexOf('function renderAdminSandbox(){'), html.indexOf('\n}\n', html.indexOf('function renderAdminSandbox(){')));
check('everything from the server that the tab prints is escaped', /esc\(p\.name\)/.test(tabSrc) && /esc\(r\.title\)/.test(tabSrc) && /esc\(r\.status\)/.test(tabSrc) && /esc\(c\.credits/.test(tabSrc));
check('the journal labels know the two new actions', has("SANDBOX_CREATED: 'Test company created'") && has("SANDBOX_SWITCHED: 'Worked as a test company'"));

// ---- the admin's lists: one world at a time
check('the lists of the console ask for the world: companies, disputes, requests, orders and reviews all go through withWorld()', ['/api/admin/companies', '/api/admin/orders?status=DISPUTED', '/api/admin/rfqs?', '/api/admin/orders?', '/api/admin/reviews?withComment=1'].every((u) => has("api(withWorld('" + u)));
const worldSrc = html.slice(html.indexOf('function withWorld(path){'), html.indexOf('function setAdminWorld'));
const withWorld = (state, path) => new Function('state', worldSrc + '; return withWorld(' + JSON.stringify(path) + ');')(state);
check('withWorld: nothing added for the real data; ?sandbox=1 or &sandbox=1 for the test area', withWorld({ adminTest: false }, '/api/admin/rfqs?page=1') === '/api/admin/rfqs?page=1' && withWorld({ adminTest: true }, '/api/admin/companies') === '/api/admin/companies?sandbox=1' && withWorld({ adminTest: true }, '/api/admin/rfqs?page=1') === '/api/admin/rfqs?page=1&sandbox=1');
check('switching the world drops the lists on screen and loads again; signing out puts it back to the real data', has('function setAdminWorld(test){') && has("setState({ adminTest: !!test, adminCompanies: [], adminDisputes: [], adminRfqs: []") && has("adminTab:'companies', adminTest:false,"));
check('the switch is on the five tabs that have a test side, with a clear "TEST" line when it is on; the card of a test company has a TEST pill', has("['companies', 'disputes', 'rfqs', 'orders', 'reviews'].includes(state.adminTab)") && has('TEST: only the sandbox companies') && has("(c.isTest ? ' <span") && has('+ adminWorldBar() + body'));

// ---- texts
const keys = ['sbxBannerTitle', 'sbxBannerText', 'sbxSwitchTo', 'sbxBack', 'sbxSwitchFailed', 'sbxEnded'];
check('every text exists in English and in Arabic (Arabic script)', keys.every((k) => typeof en[k] === 'string' && en[k] && typeof ar[k] === 'string' && /[؀-ۿ]/.test(ar[k])));
check('the placeholders are the same in both languages', /\{name\}/.test(en.sbxBannerText) && /\{role\}/.test(en.sbxBannerText) && /\{name\}/.test(ar.sbxBannerText) && /\{role\}/.test(ar.sbxBannerText));
check('the Arabic page keeps the brand-free wording and says "test mode" the same way everywhere', /الاختبار/.test(ar.sbxBannerTitle) && /الاختبار/.test(ar.sbxEnded) && ar.sbxBack.includes('الإدارة'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
