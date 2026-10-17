// Minimal Google Apps Script runtime mock: loads apps-script/*.gs into a Node vm so the real server code
// can be tested and previewed locally. Supports several sheets, records sent mail. Not deployed.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');

const SRC = path.join(__dirname, '..', 'apps-script');

function makeSheet(name, sheets) {
  const sh = { name, rows: [] };
  const range = (r, c, nr = 1, nc = 1) => {
    const api = {
      setValues(v) { for (let i = 0; i < nr; i++) { const row = sh.rows[r - 1 + i] || (sh.rows[r - 1 + i] = []); for (let j = 0; j < nc; j++) row[c - 1 + j] = v[i][j]; } return api; },
      getValues() { return Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (sh.rows[r - 1 + i] || [])[c - 1 + j] ?? '')); },
      setFontWeight() { return api; },
      clearContent() { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) if (sh.rows[r - 1 + i]) sh.rows[r - 1 + i][c - 1 + j] = ''; return api; }
    };
    return api;
  };
  Object.assign(sh, {
    getName: () => sh.name,
    setName: (n) => { delete sheets[sh.name]; sh.name = n; sheets[n] = sh; return sh; },
    getLastRow: () => { let n = sh.rows.length; while (n > 1 && sh.rows[n - 1].every((v) => v === '' || v == null)) n--; return n; },
    getLastColumn: () => Math.max(0, ...sh.rows.map((r) => r.length)),
    getRange: range,
    setFrozenRows: () => {},
    appendRow: (r) => { sh.rows[sh.getLastRow()] = r.slice(); }, // like Sheets: right after the last row with content
    deleteRow: (i) => sh.rows.splice(i - 1, 1),
    // Like Sheets, the data range ends at the last row that still has content.
    getDataRange: () => ({ getValues: () => { const w = sh.getLastColumn(); let n = sh.rows.length; while (n > 1 && sh.rows[n - 1].every((v) => v === '' || v == null)) n--; return sh.rows.slice(0, n).map((r) => Array.from({ length: w }, (_, j) => r[j] ?? '')); } })
  });
  return sh;
}

function createGas() {
  const state = { sheets: {}, props: {}, cache: new Map(), mail: [] };
  const sheet = (n) => state.sheets[n] || (state.sheets[n] = makeSheet(n, state.sheets));
  const ctx = {
    console, Date, JSON, Math,
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: (n) => state.sheets[n] || null, insertSheet: sheet }), getUi: () => ({ alert() {} }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    CacheService: { getScriptCache: () => ({
      get: (k) => (state.cache.has(k) ? state.cache.get(k) : null),
      put: (k, v) => state.cache.set(k, String(v)),
      remove: (k) => state.cache.delete(k)
    }) },
    PropertiesService: { getScriptProperties: () => ({
      getProperty: (k) => (k in state.props ? state.props[k] : null),
      setProperty: (k, v) => { state.props[k] = String(v); },
      setProperties: (o) => Object.assign(state.props, o)
    }) },
    Utilities: {
      DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
      computeDigest: (alg, s) => Array.from(crypto.createHash(alg).update(s, 'utf8').digest()).map((b) => (b > 127 ? b - 256 : b)),
      getUuid: () => crypto.randomUUID(),
      formatDate: (d) => new Date(d).toDateString()
    },
    MailApp: { sendEmail: (m) => state.mail.push(m) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (t) => ({ text: t, setMimeType() { return this; }, getContent() { return this.text; } }) },
    ScriptApp: { getProjectTriggers: () => [] }
  };
  vm.createContext(ctx);
  const code = fs.readdirSync(SRC).filter((f) => f.endsWith('.gs')).sort()
    .map((f) => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n;\n');
  vm.runInContext(code, ctx, { filename: 'apps-script.gs' });
  // Same path a browser takes: doPost with a JSON body.
  const api = (fn, ...args) => JSON.parse(ctx.doPost({ parameter: {}, postData: { contents: JSON.stringify({ fn, args }) } }).getContent());
  return { ctx, state, sheet, api };
}

module.exports = { createGas };
