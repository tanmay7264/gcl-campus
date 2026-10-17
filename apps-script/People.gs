// Stakeholders (students, faculty, company contacts, mentors, alumni…) and the tasks assigned to them.
// People do not sign in. Each person gets a private "My tasks" link (site/tasks/#<accessToken>) where they can
// update the status and progress of their own tasks. Keep the lists below in sync with site/crm-stages.js.

var PERSON_TYPES = ['Student', 'Faculty', 'Company', 'Industry mentor', 'Alumni', 'Other'];
var TASK_STATUSES = ['todo', 'doing', 'blocked', 'done'];
var TASK_LABEL = { todo: 'To do', doing: 'In progress', blocked: 'Blocked', done: 'Done' };
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function nextId_(prefix, key) {
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty(key) || 0) + 1;
  props.setProperty(key, String(n));
  return prefix + ('00' + n).slice(-3);
}

function tasksUrl_(p) { return SITE_URL + 'tasks/#' + p.accessToken; }

// ---------- People ----------

function savePerson(token, data) {
  var me = requireUser_(token);
  data = data || {};
  var p = {
    type: PERSON_TYPES.indexOf(data.type) >= 0 ? data.type : 'Other', name: clean_(data.name, 80),
    email: clean_(data.email, 120).toLowerCase(), phone: clean_(data.phone, 20), organisation: clean_(data.organisation, 120),
    role: clean_(data.role, 80), team: clean_(data.team, 80), challengeIds: clean_(data.challengeIds, 300), notes: clean_(data.notes, 1000)
  };
  if (p.name.length < 2) throw new Error('Please enter a name.');
  if (p.email && !EMAIL_RE.test(p.email)) throw new Error('Please enter a valid email address (or leave it empty).');
  return withLock_(function () {
    var all = readAll_('People');
    if (p.email && all.some(function (x) { return x.email === p.email && x.id !== data.id; })) throw new Error(p.email + ' is already in People.');
    var cur = data.id && all.filter(function (x) { return x.id === data.id; })[0];
    if (data.id && !cur) throw new Error('Person not found.');
    if (cur) {
      if (data.active === false && me.role !== 'Admin') throw new Error('Only Admins can deactivate people.');
      Object.keys(p).forEach(function (k) { cur[k] = p[k]; });
      cur.active = data.active !== false; cur.updated = new Date();
      write_('People', cur);
      return plain_(cur);
    }
    var o = Object.assign({}, p);
    o.id = nextId_('P-', 'PSEQ'); o.active = true; o.created = new Date(); o.updated = o.created; o.addedBy = me.name;
    o.accessToken = Utilities.getUuid().replace(/-/g, '');
    append_('People', o);
    return plain_(o);
  });
}

// Bulk add, one person per line: "Name, email, team or organisation". Duplicate emails are skipped.
function importPeople(token, type, text) {
  var me = requireUser_(token);
  if (PERSON_TYPES.indexOf(type) < 0) throw new Error('Pick who you are importing.');
  var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
  if (!lines.length) throw new Error('Paste at least one line.');
  if (lines.length > 500) throw new Error('At most 500 people per import.');
  return withLock_(function () {
    var seen = {}; readAll_('People').forEach(function (x) { if (x.email) seen[x.email] = 1; });
    var add = [], skipped = [];
    lines.forEach(function (l) {
      var f = l.split(/\t|,/).map(function (s) { return s.trim(); });
      var name = clean_(f[0], 80), email = clean_(f[1], 120).toLowerCase(), extra = clean_(f[2], 120);
      if (name.length < 2 || (email && !EMAIL_RE.test(email)) || (email && seen[email])) { skipped.push(l); return; }
      if (email) seen[email] = 1;
      add.push({ id: nextId_('P-', 'PSEQ'), type: type, name: name, email: email, team: type === 'Student' ? extra : '', organisation: type === 'Student' ? '' : extra,
        active: true, created: new Date(), updated: new Date(), addedBy: me.name, accessToken: Utilities.getUuid().replace(/-/g, '') });
    });
    appendMany_('People', add);
    return { added: add.length, skipped: skipped };
  });
}

// ---------- Tasks ----------

function canEditTask_(me, t) {
  if (me.role === 'Admin' || t.createdBy === me.email) return true;
  var c = t.challengeId && readAll_('Challenges').filter(function (x) { return x.id === t.challengeId; })[0];
  return !!(c && canEdit_(me, c));
}

// assignees: person ids ("P-001") and/or whole student teams ("team:Team A").
function resolveAssignees_(t, people) {
  var keys = String(t.assignees || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  return people.filter(function (p) {
    return publicPerson_(p).active && keys.some(function (k) { return k === p.id || (k.indexOf('team:') === 0 && p.team && k.slice(5) === p.team); });
  });
}

function publicPerson_(p) { var o = plain_(p); o.active = p.active === true || p.active === 'TRUE'; return o; }

function saveTask(token, data, opts) {
  var me = requireUser_(token);
  data = data || {}; opts = opts || {};
  var t = {
    title: clean_(data.title, 160), details: clean_(data.details, 2000), challengeId: clean_(data.challengeId, 20),
    assignees: (Array.isArray(data.assignees) ? data.assignees : String(data.assignees || '').split(',')).map(function (s) { return clean_(s, 90); }).filter(Boolean).join(','),
    due: data.due ? new Date(data.due) : '', priority: PRIORITIES.indexOf(data.priority) >= 0 ? data.priority : 'Medium',
    status: TASK_STATUSES.indexOf(data.status) >= 0 ? data.status : 'todo',
    progress: Math.max(0, Math.min(100, Math.round(Number(data.progress) || 0)))
  };
  if (t.title.length < 3) throw new Error('Give the task a title.');
  if (t.due && isNaN(t.due)) throw new Error('Invalid deadline.');
  if (t.challengeId && !readAll_('Challenges').some(function (c) { return c.id === t.challengeId; })) throw new Error('Linked challenge not found.');
  if (t.status === 'done') t.progress = 100;
  var res = withLock_(function () {
    var cur = data.id && readAll_('Tasks').filter(function (x) { return x.id === data.id; })[0];
    if (data.id && !cur) throw new Error('Task not found.');
    if (cur) {
      if (!canEditTask_(me, cur)) throw new Error('Only the task creator, the challenge owner or an Admin can change this task.');
      var before = { status: cur.status, progress: cur.progress, assignees: cur.assignees };
      Object.keys(t).forEach(function (k) { cur[k] = t[k]; });
      cur.updated = new Date(); cur.completedAt = t.status === 'done' ? (cur.completedAt || new Date()) : '';
      write_('Tasks', cur);
      var what = [];
      if (before.status !== cur.status) what.push(TASK_LABEL[cur.status]);
      if (Number(before.progress) !== cur.progress) what.push(cur.progress + '%');
      if (what.length) log_(cur.challengeId || cur.id, me, 'task', 'Task "' + cur.title + '": ' + what.join(' · '), false);
      return { task: cur, newAssignees: cur.assignees !== before.assignees };
    }
    var o = t; o.id = nextId_('T-', 'TSEQ'); o.created = new Date(); o.updated = o.created; o.createdBy = me.email;
    o.completedAt = t.status === 'done' ? o.created : '';
    append_('Tasks', o);
    log_(o.challengeId || o.id, me, 'task', 'New task "' + o.title + '"' + (o.due ? ', due ' + fmtDate_(o.due) : ''), false);
    return { task: o, newAssignees: true };
  });
  var sent = 0;
  if (opts.notify && res.newAssignees) sent = notifyTask_(res.task, me, 'assigned');
  var out = plain_(res.task); out.notified = sent;
  return out;
}

function deleteTask(token, id) {
  var me = requireUser_(token);
  return withLock_(function () {
    var t = readAll_('Tasks').filter(function (x) { return x.id === id; })[0];
    if (!t) throw new Error('Task not found.');
    if (me.role !== 'Admin' && t.createdBy !== me.email) throw new Error('Only the task creator or an Admin can delete a task.');
    table_('Tasks').deleteRow(t._row);
    log_(t.challengeId || t.id, me, 'task', 'Deleted task "' + t.title + '"', false);
    return true;
  });
}

function remindTask(token, id) {
  var me = requireUser_(token);
  var t = readAll_('Tasks').filter(function (x) { return x.id === id; })[0];
  if (!t) throw new Error('Task not found.');
  var n = notifyTask_(t, me, 'reminder');
  if (!n) throw new Error('No assignee with an email address to remind.');
  withLock_(function () { log_(t.challengeId || t.id, me, 'task', 'Reminder sent for "' + t.title + '" to ' + n + ' people', false); });
  return n;
}

function sendTaskLink(token, personId) {
  var me = requireUser_(token);
  var p = readAll_('People').filter(function (x) { return x.id === personId; })[0];
  if (!p || !p.email) throw new Error('This person has no email address.');
  if (isDemoAddress_(p.email)) return true;
  MailApp.sendEmail({ to: p.email, name: 'WeSchool GCL', replyTo: me.email, subject: 'Your GCL tasks',
    htmlBody: emailShell_('Your GCL tasks, ' + esc_(String(p.name).split(' ')[0]),
      '<p>Here is your private link to see the GCL tasks assigned to you, their deadlines, and to update your progress. Please keep it to yourself.</p>' + button_(tasksUrl_(p), 'Open my tasks')) });
  return true;
}

// Emails each assignee (skipping demo addresses). Returns how many were emailed.
function notifyTask_(t, me, kind) {
  var people = resolveAssignees_(t, readAll_('People')).filter(function (p) { return p.email && !isDemoAddress_(p.email); });
  var c = t.challengeId && readAll_('Challenges').filter(function (x) { return x.id === t.challengeId; })[0];
  people.forEach(function (p) {
    MailApp.sendEmail({ to: p.email, name: 'WeSchool GCL', replyTo: me.email,
      subject: (kind === 'reminder' ? 'Reminder: ' : 'New GCL task: ') + t.title + (t.due ? ' (due ' + fmtDate_(t.due) + ')' : ''),
      htmlBody: emailShell_(esc_(kind === 'reminder' ? 'A friendly reminder' : 'You have a new task'),
        '<p><b>' + esc_(t.title) + '</b>' + (c ? '<br><span style="color:#7A7590">' + esc_(String(c.organisation).replace(/^'/, '')) + ' · ' + c.id + '</span>' : '') + '</p>' +
        (t.details ? '<p style="white-space:pre-wrap">' + esc_(t.details) + '</p>' : '') +
        '<p>Deadline: <b>' + (t.due ? fmtDate_(t.due) : 'not set') + '</b> · Progress: ' + Number(t.progress || 0) + '%</p>' +
        '<p>Update your progress any time:</p>' + button_(tasksUrl_(p), 'Open my tasks')) });
  });
  return people.length;
}

// ---------- Public: a person's own tasks ----------

function personByToken_(tok) {
  tok = String(tok || '');
  var p = tok.length >= 24 && readAll_('People').filter(function (x) { return x.accessToken === tok; })[0];
  if (!p || !publicPerson_(p).active) throw new Error('NOT_FOUND');
  return p;
}

function myTasks_(p) {
  var people = readAll_('People');
  var chs = {}; readAll_('Challenges').forEach(function (c) { chs[c.id] = c; });
  return readAll_('Tasks').filter(function (t) { return resolveAssignees_(t, people).some(function (x) { return x.id === p.id; }); })
    .map(function (t) {
      var c = chs[t.challengeId];
      return { id: t.id, title: t.title, details: t.details, due: iso_(t.due), status: t.status, progress: Number(t.progress) || 0, priority: t.priority,
        challenge: c ? { id: c.id, organisation: String(c.organisation).replace(/^'/, '') } : null, viaTeam: String(t.assignees).split(',').indexOf(p.id) < 0 };
    });
}

function getMyTasks(tok) {
  var p = personByToken_(tok);
  return { person: { name: p.name, type: p.type, team: p.team, organisation: p.organisation }, tasks: myTasks_(p) };
}

function updateMyTask(tok, taskId, upd) {
  var p = personByToken_(tok);
  upd = upd || {};
  if (!myTasks_(p).some(function (t) { return t.id === taskId; })) throw new Error('That task is not assigned to you.');
  return withLock_(function () {
    var t = readAll_('Tasks').filter(function (x) { return x.id === taskId; })[0];
    var parts = [];
    if (TASK_STATUSES.indexOf(upd.status) >= 0 && upd.status !== t.status) { t.status = upd.status; parts.push(TASK_LABEL[t.status]); }
    if (upd.progress !== undefined && upd.progress !== '') {
      var pr = Math.max(0, Math.min(100, Math.round(Number(upd.progress) || 0)));
      if (pr !== Number(t.progress)) { t.progress = pr; parts.push(pr + '%'); }
    }
    if (t.status === 'done') { t.progress = 100; t.completedAt = t.completedAt || new Date(); } else t.completedAt = '';
    var note = clean_(upd.comment, 1000);
    if (!parts.length && !note) throw new Error('Nothing to update.');
    t.updated = new Date();
    write_('Tasks', t);
    log_(t.challengeId || t.id, { name: p.name + ' (' + p.type + ')' }, 'task', 'Task "' + t.title + '"' + (parts.length ? ': ' + parts.join(' · ') : '') + (note ? '\n' + note : ''), false);
    return myTasks_(p).filter(function (x) { return x.id === taskId; })[0];
  });
}
