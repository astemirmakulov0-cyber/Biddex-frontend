// Run: node test/api-base.test.js   (no dependencies)
// Which API address the pages use (config.js): the production one on every real domain, the local backend only when the
// page is opened from this computer. This runs in CI, so a change that would send production traffic elsewhere (or local
// traffic to production) fails the build.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const PROD = 'https://b2b-procurement-backend-production.up.railway.app';

let pass = 0, fail = 0;
const check = (name, ok, extra) => { ok ? pass++ : fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };

const src = fs.readFileSync(path.join(root, 'config.js'), 'utf8');
function load(hostname, search = '') {
  const win = { location: { hostname, search } };
  vm.runInNewContext(src, { window: win });
  return win;
}
const base = (hostname, search = '') => load(hostname, search).BIDDEX_API;

// ---- production ----
for (const host of ['app.biddex.online', 'biddex.online', 'www.biddex.online']) check(`${host} -> the production API`, base(host) === PROD, base(host));
check('the production address is the known one (a change must be deliberate)', PROD === 'https://b2b-procurement-backend-production.up.railway.app' && /PRODUCTION_API = '([^']+)'/.exec(src)[1] === PROD);
for (const host of ['localhost.evil.com', '127.0.0.1.evil.com', 'evil.example', 'app.biddex.online.evil.com', 'xlocalhost', '192.168.0.10', '']) check(`${JSON.stringify(host)} is not local -> the production API`, base(host) === PROD);
check('on a real domain ?api= is ignored (a crafted link cannot redirect the app)', base('app.biddex.online', '?api=http://localhost:4000') === PROD && base('app.biddex.online', '?api=https://evil.example') === PROD && base('biddex.online', '?lang=ar&api=http://127.0.0.1:4010') === PROD);

// ---- local ----
check('localhost -> http://localhost:4000', base('localhost') === 'http://localhost:4000');
check('127.0.0.1 -> http://127.0.0.1:4000 (the same host the page was opened on)', base('127.0.0.1') === 'http://127.0.0.1:4000');
check('[::1] -> http://[::1]:4000', base('[::1]') === 'http://[::1]:4000');
check('?api= with a local address and port is used on a local host', base('localhost', '?api=http://localhost:4010') === 'http://localhost:4010' && base('localhost', '?lang=ar&api=http://127.0.0.1:4100&x=1') === 'http://127.0.0.1:4100');
check('?api= with anything else is ignored on a local host (another host, https, no port, a path, a lookalike)',
  ['https://evil.example', 'http://evil.example:4000', 'http://localhost', 'http://localhost:4000/api', 'http://localhost.evil.com:4000', 'http://localhost:40000000', 'javascript:alert(1)', '%E0%A4%A', ''].every((v) => base('localhost', '?api=' + v) === 'http://localhost:4000'));

// ---- the pages ----
const pages = ['index.html', 'bid.html', 'verify.html', 'reset-password.html'];
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  const cfg = html.indexOf('<script src="config.js?v=');
  check(`${page}: loads config.js, and takes the address from it`, cfg > 0 && /const API(_URL)? = window\.BIDDEX_API;/.test(html));
  check(`${page}: config.js is loaded before any inline script that uses the address`, cfg > 0 && html.indexOf('window.BIDDEX_API') > cfg);
  check(`${page}: no API address of its own`, !/up\.railway\.app/.test(html) && !/https?:\/\/localhost/.test(html));
}
check('the production address appears in config.js and nowhere else in the site', !fs.readdirSync(root).filter((f) => /\.(html|js|webmanifest)$/.test(f) && f !== 'config.js').some((f) => /up\.railway\.app/.test(fs.readFileSync(path.join(root, f), 'utf8'))));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
