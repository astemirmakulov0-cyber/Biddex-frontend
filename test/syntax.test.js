// Run: node test/syntax.test.js   (no dependencies)
// Every inline <script> of every page, and server-errors.js, must compile: a syntax error in a 6000-line file is otherwise
// found only by opening the page in a browser.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
let pass = 0, fail = 0;
const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };

const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html')).concat(fs.existsSync(path.join(root, 'ar')) ? fs.readdirSync(path.join(root, 'ar')).filter((f) => f.endsWith('.html')).map((f) => 'ar/' + f) : []);
check('the pages are found (index, bid, verify, reset-password, privacy, terms, ar/*)', ['index.html', 'bid.html', 'verify.html', 'reset-password.html', 'privacy.html', 'terms.html'].every((p) => pages.includes(p)), pages.join(' '));
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].filter((m) => !/\bsrc\s*=/.test(m[1]) && !/type\s*=\s*["']?(application\/ld\+json|module)/.test(m[1]));
  let bad = null;
  scripts.forEach((m, i) => { try { new vm.Script(m[2], { filename: `${page}#script${i + 1}` }); } catch (e) { bad = bad || `${page} script ${i + 1}: ${e.message}`; } });
  check(`${page}: ${scripts.length} inline script(s) compile`, bad === null, bad);
}
try { new vm.Script(fs.readFileSync(path.join(root, 'server-errors.js'), 'utf8'), { filename: 'server-errors.js' }); check('server-errors.js compiles', true); } catch (e) { check('server-errors.js compiles', false, e.message); }
check('index.html carries its application script (a large inline script)', Math.max(...[...fs.readFileSync(path.join(root, 'index.html'), 'utf8').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1].length)) > 100000);
// the one place where a broken script would be invisible: a script that fails to compile must be detected by this test
let caught = false; try { new vm.Script('function (', { filename: 'sample' }); } catch (e) { caught = true; }
check('the check itself detects a syntax error', caught);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
