// Builds the folder that GitHub Pages publishes (default: _site/): only the files of the site, from an explicit list.
// Run: node tools/build-site.js [outDir]      (no dependencies)
// Everything else in the repository (tools/, test/, .github/, README.md, the *-source.svg of the icons) stays out. A file
// that is added to the site must be added here too; a missing file or a local link that leads outside the folder fails the build.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const FILES = [
  'index.html', 'bid.html', 'accept-invite.html', 'verify.html', 'reset-password.html', 'privacy.html', 'terms.html',
  'config.js', 'server-errors.js', 'manifest.webmanifest',
  'CNAME', // kept in the artifact; with the Actions source Pages takes the domain from Settings → Pages
];
const DIRS = [ // [directory, extension]
  ['ar', '.html'],
  ['icons', '.png'],
];

function list() {
  const out = FILES.slice();
  for (const [dir, ext] of DIRS) {
    const names = fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith(ext)).sort() : [];
    for (const n of names) out.push(dir + '/' + n);
  }
  return out;
}

// Local targets of a page: static src/href attributes (links built inside scripts contain quotes or '+' and are skipped).
function localRefs(html) {
  const refs = [];
  for (const m of html.matchAll(/\b(?:src|href)="([^"]*)"/g)) {
    const v = m[1];
    if (!/^[A-Za-z0-9._\/~%-]+(\?[A-Za-z0-9._=&%-]*)?(#.*)?$/.test(v) || /^(https?:|\/\/)/.test(v)) continue;
    const p = v.replace(/[?#].*$/, '');
    if (p === '' || p === '/' || p === './') continue;
    refs.push(p);
  }
  return refs;
}

// Same for the manifest: icons[].src and start_url / scope / id are resolved against the manifest's own address.
function manifestRefs(json) {
  const m = JSON.parse(json);
  const refs = (m.icons || []).map((i) => i.src).concat(m.screenshots ? m.screenshots.map((i) => i.src) : []);
  for (const s of (m.shortcuts || [])) for (const i of (s.icons || [])) refs.push(i.src);
  return refs.filter(Boolean).map((r) => r.replace(/[?#].*$/, ''));
}

function missingRefs(files, readFile) {
  const set = new Set(files);
  const missing = [];
  const resolve = (from, ref) => (ref.startsWith('/') ? ref.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(from), ref)));
  for (const f of files) {
    let refs = [];
    if (f.endsWith('.html')) refs = localRefs(readFile(f));
    else if (f.endsWith('.webmanifest')) refs = manifestRefs(readFile(f));
    else continue;
    for (const r of refs) { const t = resolve(f, r); if (!set.has(t)) missing.push(`${f} -> ${r}`); }
  }
  return missing;
}

function build(outDir) {
  const files = list();
  const absent = files.filter((f) => !fs.existsSync(path.join(root, f)));
  if (absent.length) throw new Error('missing from the repository: ' + absent.join(', '));
  const missing = missingRefs(files, (f) => fs.readFileSync(path.join(root, f), 'utf8'));
  if (missing.length) throw new Error('links to files that are not published: ' + missing.join('; '));
  fs.rmSync(outDir, { recursive: true, force: true });
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(outDir, f)), { recursive: true });
    fs.copyFileSync(path.join(root, f), path.join(outDir, f));
  }
  return files;
}

module.exports = { build, list, localRefs, manifestRefs, missingRefs };

if (require.main === module) {
  const out = path.resolve(process.argv[2] || path.join(root, '_site'));
  try {
    const files = build(out);
    console.log(`Built ${files.length} files into ${out}`);
  } catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
}
