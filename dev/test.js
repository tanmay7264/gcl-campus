// Run: node dev/test.js   (no Google account needed; runs the real apps-script/*.gs in a mock)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { createGas } = require('./gas');

const { ctx: C, state, api } = createGas();
const ok = (r) => { assert(r.ok, 'expected ok, got: ' + r.error); return r.value; };
const err = (r, re) => { assert(!r.ok, 'expected an error'); assert(re.test(r.error), 'unexpected error: ' + r.error); };

// Stage keys match the site's copy.
const siteStages = fs.readFileSync(path.join(__dirname, '..', 'site', 'crm-stages.js'), 'utf8').split('export const ST ')[0].match(/key: '(\w+)'/g).map((s) => s.slice(6, -1));
assert.deepStrictEqual(siteStages, [...C.STAGES], 'site/crm-stages.js and Crm.gs STAGES differ');

// Users: an admin and a coordinator.
C.upsertUser_({ email: 'Admin@gcl.test', name: 'Asha Admin', role: 'Admin' }, 'admin12345');
C.upsertUser_({ email: 'coord@gcl.test', name: 'Cyrus Coord', role: 'Coordinator' }, 'coord12345');

// Public submission: JSON path, validation, formula injection, honeypot, emails.
err(api('submitChallenge', { organisation: 'X', name: 'Y', email: 'bad', challenge: 'short' }), /organisation/);
const sub = ok(api('submitChallenge', { organisation: '=HYPERLINK("evil")', name: 'Priya Rao', email: 'Priya@Acme.com', type: 'Industry challenge', challenge: 'Our field sales team loses 30% of leads between first call and demo.', mentor: 'Yes' }));
assert(/^GCL-\d\d-001$/.test(sub.id) && /track\/#[0-9a-f]{32}$/.test(sub.trackUrl));
const row = C.readAll_('Challenges')[0];
assert.strictEqual(row.organisation, "'=HYPERLINK(\"evil\")", 'formula injection must be neutralised');
assert.strictEqual(row.email, 'priya@acme.com');
assert.strictEqual(state.mail.length, 2, 'acknowledgement + admin notification');
assert(state.mail[0].to === 'priya@acme.com' && state.mail[0].htmlBody.includes(sub.trackUrl));
assert(state.mail[1].to === 'admin@gcl.test' && state.mail[1].subject.includes(sub.id));
assert.strictEqual(ok(api('submitChallenge', { website: 'spam', organisation: 'Bot' })).id, '', 'honeypot drops silently');

// Legacy form-encoded post (old cached site) still lands.
const legacy = JSON.parse(C.doPost({ parameter: { organisation: 'Legacy Co', name: 'Lee', email: 'lee@legacy.com', challenge: 'A legacy challenge statement long enough to pass.' } }).getContent());
assert(legacy.ok && legacy.value.id.endsWith('-002'));

// Auth: wrong password, throttle, sessions.
err(api('getDashboard', 'nope'), /SESSION_EXPIRED/);
for (let i = 0; i < 5; i++) err(api('login', 'coord@gcl.test', 'wrong'), /Invalid/);
err(api('login', 'coord@gcl.test', 'coord12345'), /Too many/);
state.cache.delete('fail_coord@gcl.test');
const admin = ok(api('login', 'ADMIN@gcl.test', 'admin12345'));
const coord = ok(api('login', 'coord@gcl.test', 'coord12345'));
assert.strictEqual(admin.user.role, 'Admin');
const dash = ok(api('getDashboard', admin.token));
assert.strictEqual(dash.challenges.length, 2);
assert(!JSON.stringify(dash.users).includes('hash') && !JSON.stringify(dash.users).includes('salt'), 'never leak hashes');

// Coordinator limits: can claim unowned work, cannot touch someone else's.
const id = sub.id, id2 = legacy.value.id;
err(api('setStage', coord.token, id, 'review'), /Only the owner/);
ok(api('updateChallenge', coord.token, id, { owner: 'coord@gcl.test' }));
ok(api('updateChallenge', admin.token, id2, { owner: 'admin@gcl.test' }));
err(api('updateChallenge', coord.token, id2, { owner: 'coord@gcl.test' }), /Only the owner/);
err(api('saveUser', coord.token, { email: 'x@y.com', role: 'Admin' }), /Only Admins/);

// Stage moves are logged and shared; notify sends the template email; private notes stay private.
const before = state.mail.length;
const moved = ok(api('setStage', coord.token, id, 'accepted', { notify: true, message: 'Kick-off next Tuesday.' }));
assert.strictEqual(moved.stage, 'accepted');
assert.strictEqual(state.mail.length, before + 1);
assert(state.mail.at(-1).subject.includes('accepted') && state.mail.at(-1).htmlBody.includes('Kick-off next Tuesday.'));
ok(api('addNote', coord.token, id, 'Budget owner is the CFO, keep internal', false));
ok(api('addNote', coord.token, id, 'Team will visit your Pune office on Friday', true));
ok(api('updateChallenge', coord.token, id, { touchpointDate: '2026-11-03', touchpointLabel: 'Fine-tune the brief' }));
assert.strictEqual(ok(api('updateChallenge', coord.token, id, { priority: 'Urgent!!' })).priority, 'Medium', 'unknown priority ignored');

const t = ok(api('getTracking', row.trackToken));
const tj = JSON.stringify(t);
assert(!tj.includes('CFO'), 'private note leaked to tracker');
assert(tj.includes('Pune office') && tj.includes('Moved from New to Accepted') && t.touchpoint.label === 'Fine-tune the brief');
assert(!tj.includes('priya@acme.com') && !('phone' in t) && !('email' in t), 'contact details must not be on the tracker');
err(api('getTracking', 'short'), /NOT_FOUND/);

// Email composer: preview + send with recipient checks; logged.
const pv = ok(api('previewEmail', coord.token, id, 'prototype', ''));
assert(pv.to === 'priya@acme.com' && pv.body.includes(row.trackToken));
err(api('sendEmail', coord.token, id, { to: 'not-an-email', subject: 's', body: 'hello there' }), /recipient/);
ok(api('sendEmail', coord.token, id, { to: 'priya@acme.com', subject: pv.subject, body: pv.body }));
const acts = ok(api('getDashboard', admin.token)).activity.filter((a) => a.challengeId === id);
assert(acts.some((a) => a.kind === 'email' && a.user === 'Cyrus Coord'));

// Invites: admin adds a user, they set their own password via the emailed code.
ok(api('saveUser', admin.token, { email: 'new@weschool.edu', name: 'Nia', role: 'Coordinator' }));
const code = state.mail.at(-1).htmlBody.match(/#invite=([0-9a-f]+)/)[1];
err(api('acceptInvite', code, 'short'), /8 characters/);
assert.strictEqual(ok(api('acceptInvite', code, 'longenough1')).user.email, 'new@weschool.edu');
err(api('acceptInvite', code, 'longenough1'), /expired/);
err(api('saveUser', admin.token, { email: 'admin@gcl.test', name: 'A', role: 'Coordinator' }), /yourself/);

// Weekly digest goes to admins only.
const n = state.mail.length;
C.weeklyDigest();
assert.strictEqual(state.mail.length, n + 1);
assert.strictEqual(state.mail.at(-1).to, 'admin@gcl.test');

console.log('All GCL Command Centre tests passed.');

// Demo data: loads once, never emails demo contacts, removes cleanly without touching real challenges.
const realBefore = C.readAll_('Challenges').length, mailBefore = state.mail.length;
const demo = ok(api('loadDemoData', admin.token));
assert(demo.challenges >= 30 && demo.activity > demo.challenges);
err(api('loadDemoData', admin.token), /already loaded/);
err(api('loadDemoData', coord.token), /Only Admins/);
const d1 = C.readAll_('Challenges').find((c) => c.id === 'DEMO-01');
assert(/\.example$/.test(d1.email) && d1.tags === 'demo');
const movable = C.readAll_('Challenges').find((c) => c.id.startsWith('DEMO-') && c.stage !== 'completed');
ok(api('setStage', admin.token, movable.id, 'completed', { notify: true }));
ok(api('sendEmail', admin.token, movable.id, { to: movable.email, subject: 'Hello', body: 'Demo message body' }));
assert.strictEqual(state.mail.length, mailBefore, 'demo contacts must never be emailed');
const feedDates = ok(api('getDashboard', admin.token)).activity.map((a) => new Date(a.at).getTime());
assert(feedDates.every((t, i) => i === 0 || feedDates[i - 1] >= t), 'activity feed newest first');
const rm = ok(api('removeDemoData', admin.token));
assert.strictEqual(rm.challenges, demo.challenges);
assert.strictEqual(C.readAll_('Challenges').length, realBefore, 'real challenges untouched');
assert(!C.readAll_('Activity').some((a) => String(a.challengeId).startsWith('DEMO-')) && !C.readAll_('Users').some((u) => u.email.endsWith('.example')));
console.log('Demo data tests passed.');
// Shared lists match between site and backend.
const site = fs.readFileSync(path.join(__dirname, '..', 'site', 'crm-stages.js'), 'utf8');
assert.deepStrictEqual([...site.matchAll(/\{ key: '([\w ]+)', icon/g)].map((m) => m[1]), [...C.PERSON_TYPES], 'PERSON_TYPES differ');
assert.deepStrictEqual([...site.matchAll(/\{ key: '(\w+)', label: '[^']+', color/g)].map((m) => m[1]).filter((k) => C.TASK_STATUSES.includes(k)), [...C.TASK_STATUSES], 'TASK_STATUSES differ');

// People & tasks: add, import, assign to a team, email with private link, self-update, permissions, demo cleanup.
const mail0 = state.mail.length;
const fac = ok(api('savePerson', coord.token, { type: 'Faculty', name: 'Dr. Real Mentor', email: 'mentor@weschool.edu' }));
err(api('savePerson', coord.token, { type: 'Student', name: 'Dup', email: 'mentor@weschool.edu' }), /already in People/);
err(api('savePerson', coord.token, { ...fac, active: false }), /Only Admins/);
const imp = ok(api('importPeople', admin.token, 'Student', 'Asha Rao, asha@stu.edu, Team Real\nBen Das\tben@stu.edu\tTeam Real\nbad line, not-an-email\nAsha Again, asha@stu.edu, Team Real'));
assert.strictEqual(imp.added, 2); assert.strictEqual(imp.skipped.length, 2);
const task = ok(api('saveTask', coord.token, { title: 'Interview 5 shop owners', challengeId: id, assignees: ['team:Team Real', fac.id], due: '2020-01-01', progress: 20, status: 'doing' }, { notify: true }));
assert.strictEqual(task.notified, 3, 'two team members + faculty emailed');
assert(state.mail.slice(mail0).every((m) => /tasks\/#[0-9a-f]{32}/.test(m.htmlBody)));
const asha = C.readAll_('People').find((p) => p.email === 'asha@stu.edu');
const mine = ok(api('getMyTasks', asha.accessToken));
assert(mine.tasks.length === 1 && mine.tasks[0].viaTeam && !JSON.stringify(mine).includes('accessToken'));
const upd = ok(api('updateMyTask', asha.accessToken, task.id, { progress: 60, comment: 'Did 3 of 5' }));
assert.strictEqual(upd.progress, 60);
err(api('updateMyTask', asha.accessToken, 'T-999', { progress: 10 }), /not assigned/);
err(api('getMyTasks', 'x'.repeat(30)), /NOT_FOUND/);
assert(ok(api('getDashboard', admin.token)).activity.some((a) => a.kind === 'task' && a.user === 'Asha Rao (Student)' && a.detail.includes('Did 3 of 5')));
const done = ok(api('updateMyTask', asha.accessToken, task.id, { status: 'done' }));
assert(done.status === 'done' && done.progress === 100);
// The other coordinator-free admin can delete; a coordinator who didn't create it and doesn't own the challenge cannot.
ok(api('updateChallenge', admin.token, id, { owner: 'admin@gcl.test' }));
const other = ok(api('login', 'new@weschool.edu', 'longenough1'));
err(api('saveTask', other.token, { ...task, title: 'Hijack' }), /Only the task creator/);
err(api('deleteTask', other.token, task.id), /Only the task creator/);
C.weeklyDigest(); assert(state.mail.at(-1).htmlBody.includes('Overdue tasks'));
ok(api('deleteTask', admin.token, task.id));
// Demo people/tasks load and remove cleanly; real people stay.
const realPeople = C.readAll_('People').length;
const d2 = ok(api('loadDemoData', admin.token));
assert(d2.people > 100 && d2.tasks > 50, 'demo stakeholders and tasks');
const demoTask = C.readAll_('Tasks').find((t) => t.id.startsWith('DEMO-T') && t.assignees.startsWith('team:'));
const mailN = state.mail.length;
err(api('remindTask', admin.token, demoTask.id), /No assignee with an email/);
assert.strictEqual(state.mail.length, mailN, 'demo assignees are never emailed');
ok(api('removeDemoData', admin.token));
assert.strictEqual(C.readAll_('People').length, realPeople);
assert(!C.readAll_('Tasks').some((t) => t.id.startsWith('DEMO-')));
console.log('People & tasks tests passed.');
