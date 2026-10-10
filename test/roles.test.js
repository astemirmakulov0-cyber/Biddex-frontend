// Run: node test/roles.test.js   (no dependencies)
// Buttons follow the list of allowed actions the server sends (user.permissions); the app keeps no copy of the rights table.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); };

const state = { user: null, teamMembersEnabled: false };
const src = html.slice(html.indexOf('function can(action)'), html.indexOf('async function refreshConfig()'));
const { can, teamOn } = new Function('state', src + '; return { can, teamOn };')(state);

state.user = { role: 'BUYER' };
check('no list (old session or old backend): everything is allowed, as for an owner', can('rfq.publish') && can('payment.record') && can('people.manage'));
state.user = { role: 'BUYER', permissions: ['rfq.draft', 'order.receive'] };
check('a list: exactly what it names', can('rfq.draft') && can('order.receive') && !can('rfq.publish') && !can('payment.record') && !can('analytics.view'));
state.user = { role: 'BUYER', permissions: [] };
check('an empty list allows nothing', !can('rfq.draft'));
state.user = null;
check('signed out: nothing hidden by can() (the screens are not shown anyway)', can('rfq.publish'));
check('teams are off until the server says true', teamOn() === false && (state.teamMembersEnabled = 'yes', teamOn() === false) && (state.teamMembersEnabled = true, teamOn() === true));

check('no copy of the rights table in the app', !/PERMISSIONS\s*=|'people\.manage'\s*:\s*'OWNER'/.test(html));
const guards = {
  'publishing and drafts': /const publishes = can\('rfq\.publish'\)/,
  'close bidding': /r\.status === 'PUBLISHED' && can\('rfq\.publish'\)/,
  'cancel RFQ': /can\('rfq\.cancel'\) && \['DRAFT'/,
  'shortlist / reject / award': /!can\('quote\.decide'\)\) return shortlisted/,
  'record payment': /can\('payment\.record'\) && invoice\.id/,
  'review': /can\('review\.write'\) && order\.receivedAt/,
  'spending (menu, route, hint)': /can\('analytics\.view'\) \? \[\['spending'/,
  'company data and documents': /can\('company\.edit'\) \? '<button onclick="saveProfile\(\)"/,
};
for (const [name, re] of Object.entries(guards)) check('guarded by the server list: ' + name, re.test(html));
check('route #/spending sends a person without the right Home', /r\.section === 'spending' && !can\('analytics\.view'\)\) r = \{ section: 'main' \}/.test(html));
check('being removed from the company (401) ends the session with its own message', /'You are no longer a member of this company'\]/.test(html) && /noLongerMember/.test(html));
check('the team flag comes from /config/public', /setIfChanged\('teamMembersEnabled', data\.teamMembersEnabled === true\)/.test(html));
const keys = ['rfqSaveDraft', 'rfqDraftSaved', 'noLongerMember'];
const en = html.slice(html.indexOf('en: {'), html.indexOf('ar: {')), ar = html.slice(html.indexOf('ar: {'));
check('new texts exist in English and Arabic', keys.every((k) => en.includes(k + ':') && /[؀-ۿ]/.test((ar.match(new RegExp(k + ':"([^"]*)"')) || [])[1] || '')));
// drafts prepared by the team, publishing them, the history, the bell: all behind the team flag
check('"Prepared by" and the waiting banner need the flag, the label never shows for your own draft', /function preparedByOthers\(r\)\{ return teamOn\(\) && r\.status === 'DRAFT' && r\.preparedBy && !r\.preparedBy\.you; \}/.test(html) && /function draftsWaitingBanner\(rfqs\)\{\n  if \(!teamOn\(\) \|\| !can\('rfq\.publish'\)\) return ''/.test(html));
check('Publish on a draft only for a person who may publish; it asks first and opens the form when something is missing', /r\.status === 'DRAFT' && can\('rfq\.publish'\) \? '<button onclick="event\.stopPropagation\(\); publishDraft/.test(html) && /confirm\(tpl\('tmPublishConfirm'/.test(html) && /e\.status === 400\) openEditRfq\(id\)/.test(html));
check('History: only with the flag, and the supplier never gets the order block', /function historyCard\(list\)\{\n  if \(!teamOn\(\)/.test(html) && /historyCard\(isSupplier \? null : order\.activity\)/.test(html) && /\(teamOn\(\) \? '<button onclick="event\.stopPropagation\(\); openRfqHistory/.test(html));
check('the bell: "a person joined" opens People (only with the flag)', /n\.type === 'MEMBER_JOINED' && peopleOn\(\)/.test(html) && /id="' \+ id \+ '"/.test(html) && /people-card/.test(html));
check('an RFQ link from the bell or an e-mail lands a buyer on the row, never in the supplier bid form', /else \{ state\.rfqTab = rfqTabOf\(rfq\); render\(\); flashRfq\(rfq\.id\); \} return; \}/.test(html));
{
  const en = html.slice(html.indexOf('en: {'), html.indexOf('ar: {')), ar = html.slice(html.indexOf('ar: {'));
  const keys = [...new Set([...en.matchAll(/\b((?:tm|act_)\w+):/g)].map((m) => m[1]))];
  const ph = (x) => (x.match(/\{\w+\}/g) || []).sort().join(',');
  const val = (b, k) => { const m = new RegExp('\\b' + k + ':\\s*"((?:[^"\\\\]|\\\\.)*)"').exec(b); return m ? m[1] : ''; };
  check('every team text (tm*, act_*) has Arabic with Arabic script and the same placeholders', keys.length > 50 && keys.every((k) => /[؀-ۿ]/.test(val(ar, k)) && ph(val(en, k)) === ph(val(ar, k))));
  check('every action the server logs for requests and orders has a text', ['RFQ_CREATED', 'RFQ_PUBLISHED', 'RFQ_CANCELLED', 'QUOTE_SHORTLISTED', 'QUOTE_REJECTED', 'QUOTE_AWARDED', 'ORDER_RECEIVED', 'DISPUTE_OPENED', 'PAYMENT_RECORDED', 'REVIEW_POSTED'].every((a) => keys.includes('act_' + a)));
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
