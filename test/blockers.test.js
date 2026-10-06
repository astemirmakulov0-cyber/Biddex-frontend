// Run: node test/blockers.test.js   (no dependencies)
// The list of open orders shown in the admin's Deactivate / Delete dialogs (index.html: openOrderBlockersHtml).
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const grab = (re, what) => { const m = re.exec(html); if (!m) { console.error('FAIL cannot find ' + what); process.exit(1); } return m[0]; };
const esc = new Function(grab(/function esc\(s\)\{[^\n]*\}/, 'esc') + '; return esc;')();
const fnSrc = grab(/function openOrderBlockersHtml\(blockers\)\{[\s\S]*?\n\}\n/, 'openOrderBlockersHtml');
const openOrderBlockersHtml = new Function('esc', fnSrc + '; return openOrderBlockersHtml;')(esc);

let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name); };
check('nothing to show without blockers', openOrderBlockersHtml(null) === '' && openOrderBlockersHtml([]) === '');
const out = openOrderBlockersHtml([
  { rfqTitle: 'Flour <script>alert(1)</script>', status: 'IN_PROGRESS', role: 'supplier', counterparty: { name: 'Cafe "X" & Co' } },
  { rfqTitle: 'Oil', status: 'SHIPPED', role: 'buyer', counterparty: { name: 'Gulf Oil' } },
]);
check('shows the count and one line per order', /2 open order\(s\) in the way/.test(out) && (out.match(/<li>/g) || []).length === 2);
check('status in words, counterparty named by the other role', /in progress, buyer: Cafe/.test(out) && /shipped, supplier: Gulf Oil/.test(out));
check('user text is escaped (no HTML injection)', !/<script>/.test(out) && /&lt;script&gt;/.test(out) && /&quot;X&quot; &amp; Co/.test(out));
check('wiring: the Deactivate dialog retries with force only after a 409 with blockers', /confirmDeactivateCompany\(' \+ \(state\.deactivateBlockers \? 'true' : ''\) \+ '\)/.test(html) && /JSON\.stringify\(force === true \? \{ reason, force: true \} : \{ reason \}\)/.test(html));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
