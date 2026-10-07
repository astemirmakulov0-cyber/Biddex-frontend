// Run: node test/build-site.test.js   (no dependencies)
// The folder that GitHub Pages publishes (tools/build-site.js): only the files of the site, CNAME included, nothing of the
// service files, and every local link of the pages and of manifest.webmanifest leads to a file that is published.
const fs = require('fs');
const os = require('os');
const path = require('path');
const site = require('../tools/build-site.js');
let pass = 0, fail = 0;
const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };

const root = path.join(__dirname, '..');
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'biddex-site-'));
let files = [];
try { files = site.build(out); check('the site builds', true, files.length + ' files'); } catch (e) {
  check('the site builds', false, e.message);
  console.log(`\n${pass} passed, ${fail} failed`); // nothing else can be checked without the artifact
  process.exit(1);
}
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)).map((f) => e.name + '/' + f) : [e.name]));
const built = walk(out).sort();

check('the artifact is exactly the list of the site files', JSON.stringify(built) === JSON.stringify(files.slice().sort()));
check('CNAME is in the artifact and equals the one of the repository', fs.existsSync(path.join(out, 'CNAME')) && fs.readFileSync(path.join(out, 'CNAME'), 'utf8') === fs.readFileSync(path.join(root, 'CNAME'), 'utf8') && fs.readFileSync(path.join(out, 'CNAME'), 'utf8').trim() === 'app.biddex.online');
const leaked = built.filter((f) => /^(tools|test|\.github|node_modules|_site)\//.test(f) || /(^|\/)(README|\.git|\.env)/i.test(f) || /\.(test\.js|svg|md|log|pem|key)$/.test(f));
check('no service files in the artifact (tools/, test/, .github/, README, *.svg sources, secrets)', leaked.length === 0, leaked.join(' '));
check('the pages and scripts of the site are all there', ['index.html', 'bid.html', 'verify.html', 'reset-password.html', 'privacy.html', 'terms.html', 'ar/privacy.html', 'ar/terms.html', 'config.js', 'server-errors.js', 'manifest.webmanifest'].every((f) => built.includes(f)));

// links: HTML src/href and the manifest, checked against the built folder itself
const miss = site.missingRefs(built, (f) => fs.readFileSync(path.join(out, f), 'utf8'));
check('every local src/href of every page leads to a published file', miss.filter((m) => !m.startsWith('manifest.webmanifest')).length === 0, miss.join('; '));
const manifest = JSON.parse(fs.readFileSync(path.join(out, 'manifest.webmanifest'), 'utf8'));
const icons = (manifest.icons || []).map((i) => i.src.replace(/[?#].*$/, ''));
check('manifest.webmanifest: has icons', icons.length >= 3, icons.join(' '));
check('manifest.webmanifest: every icon is a published file', icons.every((s) => built.includes(path.posix.normalize(s))), icons.filter((s) => !built.includes(path.posix.normalize(s))).join(' '));
check('manifest.webmanifest: start_url and scope stay inside the site', [manifest.start_url, manifest.scope].every((u) => typeof u === 'string' && !/^(https?:)?\/\//.test(u) && !u.includes('..')));

// the checks themselves must be able to fail
check('a link to a missing file is detected', site.missingRefs(['a.html'], () => '<img src="nope.png?v=1">').length === 1);
check('a root-absolute link is resolved from the site root', site.missingRefs(['ar/a.html', 'icons/x.png'], (f) => '<link href="/icons/x.png?v=2">').length === 0);
check('a manifest icon that is not published is detected', site.missingRefs(['manifest.webmanifest'], () => '{"icons":[{"src":"icons/gone.png?v=2"}]}').length === 1);
check('links built inside scripts are not mistaken for files', site.localRefs('<script>h = \'<img src="\' + esc(u) + \'">\'; </script>').length === 0);

fs.rmSync(out, { recursive: true, force: true });
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
