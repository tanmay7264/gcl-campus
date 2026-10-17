// GCL Command Centre backend: web app entry points, Sheet storage and the Sheet menu.
// Managed with clasp from the GCL repo (apps-script/ is the rootDir). After a push, redeploy the SAME
// deployment (Deploy → Manage deployments → edit → New version) so the /exec URL never changes.

var SITE_URL = 'https://tanmay7264.github.io/gcl-campus/site/';

// JSON API: body {"fn": "...", "args": [...]}, sent as text/plain so browsers make a simple CORS request.
// Only these functions are callable from outside.
var API_FUNCTIONS = {
  submitChallenge: function (form) { return submitChallenge(form); },
  getTracking: function (token) { return getTracking(token); },
  login: function (email, pass) { return login(email, pass); },
  logout: function (token) { return logout(token); },
  acceptInvite: function (code, pass) { return acceptInvite(code, pass); },
  getDashboard: function (token) { return getDashboard(token); },
  updateChallenge: function (token, id, patch) { return updateChallenge(token, id, patch); },
  setStage: function (token, id, stage, opts) { return setStage(token, id, stage, opts); },
  addNote: function (token, id, text, shared) { return addNote(token, id, text, shared); },
  previewEmail: function (token, id, template, message) { return previewEmail(token, id, template, message); },
  sendEmail: function (token, id, mail) { return sendEmail(token, id, mail); },
  saveUser: function (token, user) { return saveUser(token, user); },
  loadDemoData: function (token) { return loadDemoData(token); },
  removeDemoData: function (token) { return removeDemoData(token); }
};

function doPost(e) {
  var out;
  try {
    var p = (e && e.parameter) || {};
    if (p.organisation !== undefined) { // legacy form-encoded post from older cached copies of the site
      out = { ok: true, value: submitChallenge(p) };
    } else {
      var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
      var fn = API_FUNCTIONS[req.fn];
      if (!fn) throw new Error('Unknown function');
      out = { ok: true, value: fn.apply(null, Array.isArray(req.args) ? req.args : []) };
    }
  } catch (err) {
    out = { ok: false, error: err && err.message ? err.message : String(err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return ContentService.createTextOutput('GCL Command Centre API. Open ' + SITE_URL + 'admin/');
}

// ---------- Sheet storage ----------
// Each tab is a table with a header row; rows are read as objects keyed by header.

var TABLES = {
  Challenges: ['id', 'created', 'organisation', 'name', 'designation', 'email', 'phone', 'type', 'challenge', 'link',
    'mentor', 'stage', 'stageAt', 'priority', 'owner', 'facultyMentor', 'industryMentor', 'studentTeam',
    'touchpointDate', 'touchpointLabel', 'trackToken', 'updated', 'closedReason', 'tags'],
  Activity: ['at', 'challengeId', 'user', 'kind', 'detail', 'shared'],
  Users: ['email', 'name', 'role', 'active', 'salt', 'hash', 'inviteCode', 'inviteExpires', 'created']
};

function table_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  var h = TABLES[name];
  if (sh.getLastRow() === 0 || sh.getLastColumn() < h.length) { // new columns are only ever appended
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readAll_(name) {
  var values = table_(name).getDataRange().getValues(), h = TABLES[name];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var o = { _row: i + 1 };
    h.forEach(function (k, j) { o[k] = values[i][j] === undefined ? '' : values[i][j]; });
    rows.push(o);
  }
  return rows;
}

function toRow_(name, o) {
  return TABLES[name].map(function (k) { return o[k] === undefined || o[k] === null ? '' : o[k]; });
}

function append_(name, o) { table_(name).appendRow(toRow_(name, o)); }

function write_(name, o) {
  table_(name).getRange(o._row, 1, 1, TABLES[name].length).setValues([toRow_(name, o)]);
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// Trim, cap length and neutralise spreadsheet formula injection.
function clean_(v, maxLen) {
  var s = (v === null || v === undefined) ? '' : String(v).trim().slice(0, maxLen || 500);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function iso_(v) { return v instanceof Date ? v.toISOString() : v; }

function plain_(o) { // strip internals and make dates JSON-safe
  var out = {};
  Object.keys(o).forEach(function (k) { if (k.charAt(0) !== '_') out[k] = iso_(o[k]); });
  return out;
}

// ---------- Sheet menu ----------

function onOpen() {
  SpreadsheetApp.getUi().createMenu('GCL CRM')
    .addItem('1. Set up GCL CRM', 'setup')
    .addItem('2. Add or reset a user', 'promptUser')
    .addItem('Install weekly digest (Mondays 9am)', 'installDigest')
    .addItem('Show links', 'showLinks')
    .addSeparator()
    .addItem('Remove test challenges (organisation starts with TEST)', 'removeTestChallenges')
    .addSeparator()
    .addItem('Load demo data', 'menuLoadDemo')
    .addItem('Remove demo data', 'menuRemoveDemo')
    .addToUi();
}

// Creates the tabs and moves rows from the original one-tab form sheet into Challenges.
function setup() {
  Object.keys(TABLES).forEach(table_);
  var moved = migrateLegacy_();
  SpreadsheetApp.getUi().alert('GCL CRM is ready.' + (moved ? '\n\nMoved ' + moved + ' earlier submission(s) into Challenges.' : ''));
}

function migrateLegacy_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), legacy = ss.getSheetByName('Sheet1');
  if (!legacy || legacy.getLastRow() < 2) return 0;
  var values = legacy.getDataRange().getValues(), h = values.shift();
  if (h[0] !== 'timestamp') return 0;
  var n = 0;
  values.forEach(function (r) {
    var o = {};
    h.forEach(function (k, i) { o[k] = r[i]; });
    if (/^TEST/i.test(String(o.organisation))) return;
    createChallenge_(o, o.timestamp instanceof Date ? o.timestamp : new Date(), false);
    n++;
  });
  legacy.setName('Legacy form (migrated)');
  return n;
}

function promptUser() {
  var ui = SpreadsheetApp.getUi();
  var e = ui.prompt('User email', 'Email address they will sign in with:', ui.ButtonSet.OK_CANCEL);
  if (e.getSelectedButton() !== ui.Button.OK) return;
  var email = String(e.getResponseText()).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { ui.alert('That is not a valid email. Nothing was changed.'); return; }
  var n = ui.prompt('Name', 'Their name (shown in the activity log):', ui.ButtonSet.OK_CANCEL);
  if (n.getSelectedButton() !== ui.Button.OK) return;
  var r = ui.alert('Role', 'Make ' + email + ' an Admin?\n\nYes = Admin (everything, incl. team management)\nNo = Coordinator (their own challenges)', ui.ButtonSet.YES_NO_CANCEL);
  if (r === ui.Button.CANCEL) return;
  var p = ui.prompt('Password', 'Choose a password (at least 8 characters). Only a salted hash is stored:', ui.ButtonSet.OK_CANCEL);
  if (p.getSelectedButton() !== ui.Button.OK) return;
  if (p.getResponseText().length < 8) { ui.alert('Password must be at least 8 characters. Nothing was changed.'); return; }
  upsertUser_({ email: email, name: n.getResponseText().trim() || email, role: r === ui.Button.YES ? 'Admin' : 'Coordinator', active: true }, p.getResponseText());
  ui.alert('Saved. ' + email + ' can sign in at\n' + SITE_URL + 'admin/');
}

function installDigest() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'weeklyDigest') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('weeklyDigest').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(9).create();
  SpreadsheetApp.getUi().alert('Weekly digest installed: every Monday around 9am to all active Admins.');
}

function showLinks() {
  SpreadsheetApp.getUi().alert('Admin dashboard:\n' + SITE_URL + 'admin/\n\nCompanies get a private tracking link by email when they submit.');
}

function removeTestChallenges() {
  var ui = SpreadsheetApp.getUi(), sh = table_('Challenges');
  var rows = readAll_('Challenges').filter(function (c) { return /^TEST/i.test(String(c.organisation)); });
  if (!rows.length) { ui.alert('No test challenges found.'); return; }
  if (ui.alert('Delete ' + rows.length + ' test challenge(s)?', ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  rows.reverse().forEach(function (c) { sh.deleteRow(c._row); });
  ui.alert('Deleted ' + rows.length + ' test challenge(s).');
}
