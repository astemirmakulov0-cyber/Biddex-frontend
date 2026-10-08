// Run: node test/suspension-reason.test.js   (no dependencies)
// The admin console shows "Last suspension reason" only for a company that is NOT suspended any more; the owner's banner
// needs a suspension (suspendedAt) to show at all.
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
let pass = 0, fail = 0;
const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || extra === undefined ? '' : '  ' + JSON.stringify(extra))); };

const a = html.indexOf('function lastSuspensionReasonHtml'), b = html.indexOf('function suspensionBanner');
check('the helper is in index.html', a > 0 && b > a);
const esc = (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const lastSuspensionReasonHtml = new Function('esc', html.slice(a, b) + '; return lastSuspensionReasonHtml;')(esc);
check('reactivated company with a reason: the line "Last suspension reason: ..." (escaped)', lastSuspensionReasonHtml({ suspendedAt: null, suspensionReason: 'Fake <b>docs</b>' }).includes('Last suspension reason: Fake &lt;b&gt;docs&lt;/b&gt;'));
check('still suspended: no line (the badge and the banner carry the reason)', lastSuspensionReasonHtml({ suspendedAt: '2026-10-08T10:00:00Z', suspensionReason: 'x' }) === '');
check('never suspended / no reason: no line', lastSuspensionReasonHtml({ suspendedAt: null, suspensionReason: null }) === '' && lastSuspensionReasonHtml({}) === '' && lastSuspensionReasonHtml(null) === '');
const banner = html.slice(html.indexOf('function suspensionBanner'), html.indexOf('function suspensionBanner') + 300);
check('the owner banner is shown only while suspendedAt is set', /if \(!state\.company \|\| !state\.company\.suspendedAt\) return ''/.test(banner));
check('the admin company card uses the helper', html.includes('lastSuspensionReasonHtml(c)'));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
