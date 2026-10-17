// Challenges pipeline: public submission + tracking, and the signed-in actions behind the Command Centre.
// Keep STAGES in sync with site/crm-stages.js (dev/test.js checks this).

var STAGES = ['new', 'review', 'accepted', 'team', 'stakeholders', 'journey', 'insights', 'prototype', 'final', 'completed', 'hold', 'declined'];
var STAGE_LABEL = {
  new: 'New', review: 'Under review', accepted: 'Accepted', team: 'Team formed', stakeholders: 'Stakeholder mapping',
  journey: 'Customer journey', insights: 'Insights', prototype: 'Prototype', final: 'Final presentation',
  completed: 'Completed', hold: 'On hold', declined: 'Declined'
};
var TYPES = ['Industry challenge', 'Social challenge', 'Sustainability / SDG', 'Specific business issue', 'Survey / research work', 'Process needing innovative intervention'];
var PRIORITIES = ['High', 'Medium', 'Low'];

// ---------- Public ----------

function submitChallenge(form) {
  form = form || {};
  if (form.website) return { id: '', trackUrl: '' }; // honeypot: silently drop bots
  var f = {
    organisation: clean_(form.organisation, 120), name: clean_(form.name, 80), designation: clean_(form.designation, 80),
    email: clean_(form.email, 120).toLowerCase(), phone: clean_(form.phone, 20), type: clean_(form.type, 60),
    challenge: clean_(form.challenge, 5000), link: clean_(form.link, 500), mentor: form.mentor === 'Yes' || form.mentor === true ? 'Yes' : ''
  };
  if (f.organisation.length < 2) throw new Error('Please enter your organisation.');
  if (f.name.length < 2) throw new Error('Please enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) throw new Error('Please enter a valid work email.');
  if (f.challenge.length < 30) throw new Error('Please describe the challenge in at least 30 characters.');
  if (f.link && !/^https?:\/\//i.test(f.link)) throw new Error('The supporting link must start with http:// or https://');
  var c = createChallenge_(f, new Date(), true);
  return { id: c.id, trackUrl: trackUrl_(c) };
}

function createChallenge_(f, when, notify) {
  var c = withLock_(function () {
    var props = PropertiesService.getScriptProperties();
    var seq = Number(props.getProperty('SEQ') || 0) + 1;
    props.setProperty('SEQ', String(seq));
    var o = {
      id: 'GCL-' + String(when.getFullYear()).slice(-2) + '-' + ('00' + seq).slice(-3), created: when,
      organisation: clean_(f.organisation, 120), name: clean_(f.name, 80), designation: clean_(f.designation, 80),
      email: clean_(f.email, 120).toLowerCase(), phone: clean_(f.phone, 20), type: clean_(f.type, 60),
      challenge: clean_(f.challenge, 5000), link: clean_(f.link, 500), mentor: f.mentor === 'Yes' ? 'Yes' : '',
      stage: 'new', stageAt: when, priority: 'Medium', trackToken: Utilities.getUuid().replace(/-/g, ''), updated: when
    };
    append_('Challenges', o);
    append_('Activity', { at: when, challengeId: o.id, user: 'Website', kind: 'stage', detail: 'Challenge received', shared: true });
    return o;
  });
  if (notify) {
    mail_(c, 'received', '', null);
    var admins = readAll_('Users').filter(function (u) { return u.role === 'Admin' && publicUser_(u).active; }).map(function (u) { return u.email; });
    if (admins.length) MailApp.sendEmail({
      to: admins.join(','), name: 'GCL Command Centre', replyTo: c.email,
      subject: 'New challenge ' + c.id + ': ' + c.organisation,
      htmlBody: emailShell_('New challenge from ' + esc_(c.organisation),
        '<p><b>' + esc_(c.name) + '</b>' + (c.designation ? ', ' + esc_(c.designation) : '') + ' · ' + esc_(c.type) + (c.mentor ? ' · wants to mentor' : '') + '</p>' +
        '<blockquote style="margin:0;padding:10px 14px;background:#F6F4FA;border-radius:10px">' + esc_(c.challenge).replace(/\n/g, '<br>') + '</blockquote>' +
        button_(SITE_URL + 'admin/#c=' + c.id, 'Open in Command Centre'))
    });
  }
  return c;
}

function trackUrl_(c) { return SITE_URL + 'track/#' + c.trackToken; }

// What a company sees on its private tracking page: no contact details, no private notes.
function getTracking(token) {
  token = String(token || '');
  var c = token.length >= 24 && readAll_('Challenges').filter(function (x) { return x.trackToken === token; })[0];
  if (!c) throw new Error('NOT_FOUND');
  var log = readAll_('Activity').filter(function (a) { return a.challengeId === c.id && (a.shared === true || a.shared === 'TRUE'); });
  return {
    id: c.id, organisation: c.organisation, type: c.type, challenge: String(c.challenge).slice(0, 400), created: iso_(c.created),
    stage: c.stage, stageAt: iso_(c.stageAt), team: c.studentTeam, industryMentor: c.industryMentor,
    touchpoint: c.touchpointDate ? { date: iso_(c.touchpointDate), label: c.touchpointLabel } : null,
    updates: log.map(function (a) { return { at: iso_(a.at), kind: a.kind, text: a.detail }; }).reverse()
  };
}

// ---------- Signed in ----------

function getDashboard(token) {
  var me = requireUser_(token);
  var users = readAll_('Users').map(publicUser_);
  var activity = readAll_('Activity').slice(-600).map(plain_).reverse();
  return { me: me, challenges: readAll_('Challenges').map(plain_), activity: activity, users: users, generatedAt: new Date().toISOString() };
}

function canEdit_(me, c) {
  return me.role === 'Admin' || c.owner === me.email || c.facultyMentor === me.email;
}

function getChallenge_(id) {
  var c = readAll_('Challenges').filter(function (x) { return x.id === id; })[0];
  if (!c) throw new Error('Challenge ' + id + ' not found.');
  return c;
}

function log_(id, me, kind, detail, shared) {
  append_('Activity', { at: new Date(), challengeId: id, user: me.name, kind: kind, detail: clean_(detail, 2000), shared: !!shared });
}

var EDITABLE = { priority: 20, owner: 120, facultyMentor: 120, industryMentor: 120, studentTeam: 200, touchpointDate: 30, touchpointLabel: 120, tags: 200, closedReason: 300 };

function updateChallenge(token, id, patch) {
  var me = requireUser_(token);
  patch = patch || {};
  return withLock_(function () {
    var c = getChallenge_(id);
    var claiming = !c.owner && Object.keys(patch).length === 1 && patch.owner === me.email; // coordinators may claim unowned work
    if (!canEdit_(me, c) && !claiming) throw new Error('Only the owner, the faculty mentor or an Admin can change ' + id + '.');
    var changes = [];
    Object.keys(patch).forEach(function (k) {
      if (!EDITABLE[k]) return;
      var v = clean_(patch[k], EDITABLE[k]);
      if (k === 'priority' && PRIORITIES.indexOf(v) < 0) return;
      if (k === 'touchpointDate') v = v ? new Date(v) : '';
      if (k === 'touchpointDate' && v && isNaN(v)) throw new Error('Invalid touchpoint date.');
      if (String(iso_(c[k])) === String(iso_(v))) return;
      c[k] = v; changes.push(k);
    });
    if (!changes.length) return plain_(c);
    c.updated = new Date();
    write_('Challenges', c);
    var tp = changes.indexOf('touchpointDate') >= 0 || changes.indexOf('touchpointLabel') >= 0;
    if (tp && c.touchpointDate) log_(id, me, 'touchpoint', 'Next touchpoint: ' + (c.touchpointLabel || 'Meeting') + ' on ' + fmtDate_(c.touchpointDate), true);
    var rest = changes.filter(function (k) { return k !== 'touchpointDate' && k !== 'touchpointLabel'; });
    if (rest.length) log_(id, me, 'assign', rest.map(function (k) { return k + ' → ' + (c[k] || '(none)'); }).join(' · '), false);
    return plain_(c);
  });
}

function setStage(token, id, stage, opts) {
  var me = requireUser_(token);
  opts = opts || {};
  if (STAGES.indexOf(stage) < 0) throw new Error('Unknown stage.');
  var c = withLock_(function () {
    var c = getChallenge_(id);
    if (!canEdit_(me, c)) throw new Error('Only the owner, the faculty mentor or an Admin can move ' + id + '.');
    if (c.stage === stage) return c;
    var from = c.stage;
    c.stage = stage; c.stageAt = new Date(); c.updated = c.stageAt;
    if (opts.reason) c.closedReason = clean_(opts.reason, 300);
    write_('Challenges', c);
    log_(id, me, 'stage', 'Moved from ' + STAGE_LABEL[from] + ' to ' + STAGE_LABEL[stage], stage !== 'hold');
    return c;
  });
  if (opts.notify && c.email) mail_(c, stage, opts.message, me);
  return plain_(c);
}

function addNote(token, id, text, shared) {
  var me = requireUser_(token);
  text = clean_(text, 2000);
  if (text.length < 2) throw new Error('Write a note first.');
  var c = getChallenge_(id);
  if (!canEdit_(me, c)) throw new Error('Only the owner, the faculty mentor or an Admin can add notes to ' + id + '.');
  withLock_(function () { log_(id, me, 'note', text, !!shared); });
  return true;
}

function previewEmail(token, id, template, message) {
  requireUser_(token);
  var c = getChallenge_(id);
  return composeMail_(c, template || c.stage, message || '');
}

function sendEmail(token, id, mail) {
  var me = requireUser_(token);
  var c = getChallenge_(id);
  if (!canEdit_(me, c)) throw new Error('Only the owner, the faculty mentor or an Admin can email about ' + id + '.');
  mail = mail || {};
  var to = String(mail.to || '').split(/[,;\s]+/).filter(Boolean);
  if (!to.length || to.some(function (e) { return !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); })) throw new Error('Check the recipient email addresses.');
  if (to.length > 10) throw new Error('At most 10 recipients per email.');
  var subject = clean_(mail.subject, 200), body = String(mail.body || '').slice(0, 8000);
  if (!subject || body.trim().length < 5) throw new Error('Add a subject and a message.');
  MailApp.sendEmail({
    to: to.join(','), name: 'WeSchool GCL', replyTo: me.email, subject: subject,
    htmlBody: emailShell_(esc_(subject), esc_(body).replace(/\n/g, '<br>') + '<p style="margin-top:22px">' + button_(trackUrl_(c), 'Track this challenge') + '</p>')
  });
  var toCompany = to.indexOf(c.email) >= 0; // shared entries reach the public tracker, so they never carry addresses
  withLock_(function () { log_(id, me, 'email', (toCompany ? 'Emailed the company contact' : 'Emailed ' + to.join(', ')) + ': ' + subject, toCompany); });
  return true;
}

function fmtDate_(d) { return Utilities.formatDate(new Date(d), 'Asia/Kolkata', 'EEE d MMM yyyy'); }
