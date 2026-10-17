// Local preview of the whole site with the real Apps Script backend running in a mock.
// Run: node dev/server.js  →  http://localhost:8766/site/  ·  /site/admin/  ·  /site/track/#<token>
// Seeds the same demo data as Sheet menu → Load demo data (pass --no-seed for an empty CRM). Demo sign-in is printed on start.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createGas } = require('./gas');

const PORT = Number(process.env.PORT) || 8766;
const ROOT = path.join(__dirname, '..');
const { ctx: C, state, api } = createGas();
const PASS = 'gcl-demo-2026';
C.upsertUser_({ email: 'admin@gcl.test', name: 'Asha Menon', role: 'Admin' }, PASS);
C.upsertUser_({ email: 'coord@gcl.test', name: 'Rahul Iyer', role: 'Coordinator' }, PASS);

if (!process.argv.includes('--no-seed')) console.log('Seeded demo data:', JSON.stringify(C.seedDemo_('admin@gcl.test')));
state.mail.length = 0;

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.pdf': 'application/pdf' };
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'POST' && url.pathname === '/api') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let out;
      try { const { fn, args } = JSON.parse(body || '{}'); out = api(fn, ...(args || [])); } catch (e) { out = { ok: false, error: e.message }; }
      if (out && !out.ok) console.log('API error:', out.error);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(out));
    });
    return;
  }
  if (url.pathname === '/dev/mail') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify(state.mail.map(({ to, subject }) => ({ to, subject })))); }
  let file = path.normalize(path.join(ROOT, decodeURIComponent(url.pathname)));
  if (!file.startsWith(ROOT)) { res.statusCode = 403; return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('Not found'); }
  res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
}).listen(PORT, () => console.log(`Site:    http://localhost:${PORT}/site/\nAdmin:   http://localhost:${PORT}/site/admin/  (admin@gcl.test or coord@gcl.test / ${PASS})\nOutbox:  http://localhost:${PORT}/dev/mail`));
