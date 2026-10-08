// Run: node test/audit-tab.test.js   (no dependencies)
// The admin "Audit log" tab of index.html: every action has a label, the details line, the tab is wired, and
// everything that comes from the journal is escaped before it reaches the page.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };

const a = html.indexOf('// ---------- Admin: audit log ----------'), b = html.indexOf('// ---------- Admin: analytics ----------');
check('the audit log block is in index.html', a > 0 && b > a);
const block = html.slice(a, b);
const { AUDIT_ACTION_LABELS, auditDetailsText } = new Function(block.slice(0, block.indexOf('async function refreshAdminAudit')) + block.slice(block.indexOf('function auditDetailsText'), block.indexOf('function renderAdminAudit')) + '; return { AUDIT_ACTION_LABELS, auditDetailsText };')();

const ACTIONS = ['COMPANY_VERIFICATION_SET', 'COMPANY_SUSPENDED', 'COMPANY_REACTIVATED', 'COMPANY_DELETED', 'COMPANY_PASSWORD_RESET', 'WALLET_TOPUP', 'DISPUTE_RESOLVED', 'REVIEW_COMMENT_HIDDEN', 'REVIEW_COMMENT_SHOWN',
  'VERIFICATION_DOCUMENT_VIEWED', 'BID_LINK_CREATED', 'BID_LINK_REISSUED', 'BID_LINK_REVOKED', 'SUPPLIER_CONTACT_RECORDED', 'SUPPLIER_CONTACT_WITHDRAWN', 'SUPPLIER_CONTACT_VIEWED',
  'ORDER_CHAT_VIEWED', 'ORDER_DOCUMENT_DOWNLOADED', 'QUOTE_ATTACHMENT_DOWNLOADED']; // = ACTIONS in b2b-backend/src/utils/adminAudit.js
check('every action of the backend has a readable label, and there are no others', ACTIONS.every((x) => typeof AUDIT_ACTION_LABELS[x] === 'string' && AUDIT_ACTION_LABELS[x].length > 3) && Object.keys(AUDIT_ACTION_LABELS).length === ACTIONS.length);

check('details: key: value pairs; the company, the admin and the second company are left out of them', auditDetailsText({ companyName: 'A', adminEmail: 'x@y', reason: 'Late', force: true, openOrders: 2 }) === 'reason: Late · force: true · openOrders: 2');
check('details: the other party of a dispute / review comes first as "with <name>"', auditDetailsText({ otherCompanyId: 'c2', otherCompanyName: 'Co Two', resolution: 'RESUME' }) === 'with Co Two · resolution: RESUME');
check('details: empty values are skipped, long values are cut at 160 characters, objects are shown as JSON', auditDetailsText({ a: null, b: '', c: 'x'.repeat(300), d: { k: 1 } }) === 'c: ' + 'x'.repeat(160) + '… · d: {"k":1}');
check('details: nothing at all -> empty text', auditDetailsText({}) === '' && auditDetailsText(null) === '' && auditDetailsText(undefined) === '');

check('the tab button and the tab body are wired into the admin console', html.includes('setAdminTab(' + String.fromCharCode(92) + "'audit" + String.fromCharCode(92) + "')") && /state\.adminTab === 'audit' \? renderAdminAudit\(\)/.test(html) && /else if \(tab === 'audit'\) refreshAdminAudit\(\)/.test(html));
check('the tab only reads: the code calls GET /api/admin/audit-log and no other method on it', /api\('\/api\/admin\/audit-log\?'/.test(block) && !/audit-log[^)]*method/.test(block) && !/method:\s*'(POST|PUT|PATCH|DELETE)'/.test(block));
const render = block.slice(block.indexOf('function renderAdminAudit'));
const raw = render.match(/\br\.[A-Za-z]+/g) || [];
const unescaped = [];
for (const m of render.matchAll(/\br\.([A-Za-z]+)/g)) { const before = render.slice(Math.max(0, m.index - 40), m.index); if (/^ \?/.test(render.slice(m.index + m[0].length, m.index + m[0].length + 3))) continue; /* a condition, not output */ if (!/(esc|String|auditDetailsText|AUDIT_ACTION_LABELS\[r\.action\] \|\| r\.action|slice)\([^)]*$/.test(before) && !/AUDIT_ACTION_LABELS\[$/.test(before) && !/\|\| $/.test(before)) unescaped.push(m[0] + ' after ' + JSON.stringify(before.slice(-25))); }
check('every journal value used in the table is escaped (esc) before it is put into HTML', raw.length >= 6 && unescaped.length === 0, unescaped);
check('filter values and company names are escaped as well', /esc\(c\.name\)/.test(render) && /esc\(c\.id\)/.test(render) && /esc\(a\)/.test(render) && /esc\(f\.dateFrom\)/.test(render));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
