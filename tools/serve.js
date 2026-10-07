#!/usr/bin/env node
// A tiny static file server for trying the frontend on this computer: node tools/serve.js [port]
// No dependencies. It serves this repository's folder on http://localhost:8080 (default) and only to this computer
// (it listens on 127.0.0.1). With the page on localhost, config.js sends API calls to the local backend (port 4000).
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const port = Number(process.argv[2] || process.env.PORT || 8080);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8',
};
// never served: the git data, hidden files and the tooling
const HIDDEN = new Set(['node_modules', 'tools', 'test']);

const server = http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch (e) { res.writeHead(400); return res.end('Bad request'); }
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.normalize(path.join(root, rel));
  const parts = path.relative(root, file).split(path.sep);
  if (!file.startsWith(root + path.sep) || parts.some((p) => p.startsWith('.') || HIDDEN.has(p))) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    // no caching: after an edit a reload shows the change (GitHub Pages caches for 10 minutes, this must not)
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
});

server.on('error', (e) => { console.error(e.code === 'EADDRINUSE' ? `Port ${port} is already in use: pick another one, e.g. node tools/serve.js 8081` : e.message); process.exit(1); });
server.listen(port, '127.0.0.1', () => {
  console.log(`Biddex frontend: http://localhost:${port}   (API: http://localhost:4000, or add ?api=http://localhost:<port>)`);
  console.log('Stop with Ctrl+C.');
});
