// GCL Command Centre: sign-in, command centre, pipeline board, challenges, people & tasks, partners, team.
// Talks to apps-script/ through ../api.js. All writes go through the server, which enforces roles.
import { api, esc } from '../api.js?v=21';
import { STAGES, ST, PATH, TYPES, PERSON_TYPES, PT, TASK_STATUSES, TS } from '../crm-stages.js?v=21';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const ms = n => `<span class="ms" aria-hidden="true">${n}</span>`;
const DAY = 864e5;
const OPEN = c => !['completed', 'declined'].includes(c.stage);
const LIVE = c => OPEN(c) && c.stage !== 'hold';
const days = d => Math.floor((Date.now() - new Date(d)) / DAY);
const fmt = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const ago = d => { const n = days(d); return n <= 0 ? 'today' : n === 1 ? 'yesterday' : n < 30 ? n + 'd ago' : fmt(d); };
const initials = s => String(s || '?').split(/[\s.@]+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
const COLORS = ['#66518A', '#3FA796', '#E8892B', '#4F86C6', '#B98A55', '#7AA342', '#C0504D', '#7B63A6'];
const colorOf = s => COLORS[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
const trackUrl = c => new URL('../track/#' + c.trackToken, location.href).href;

let token = sessionStorage.getItem('gclToken');
let me = null, D = null;              // signed-in user, dashboard data
let view = 'home', openId = null;     // current view, open challenge
const F = { q: '', stage: '', type: '', owner: '', priority: '', sort: 'updated', dir: -1 };
const charts = {};
const app = $('#app'), drawer = $('#drawer'), modal = $('#modal');

/* ---------- helpers ---------- */
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600); }
const userName = email => D?.users.find(u => u.email === email)?.name || email || '';
const canEdit = c => me.role === 'Admin' || c.owner === me.email || c.facultyMentor === me.email;
const stageChip = s => `<span class="chip" style="background:${ST[s].color}1F;color:${ST[s].color}"><i></i>${ST[s].label}</span>`;
const avatar = email => email ? `<span class="av" style="background:${colorOf(email)}" title="${esc(userName(email))}">${initials(userName(email))}</span>` : '<span class="av none" title="No owner">?</span>';
const orgTile = (c, lg) => `<span class="tile${lg ? ' lg' : ''}" style="background:${colorOf(c.organisation)}">${esc(String(c.organisation).replace(/^'/, '')[0] || '?')}</span>`;
const org = c => esc(String(c.organisation).replace(/^'/, '')); // sheet-safe prefix is for the Sheet, not the screen
const isDemo = c => /^DEMO-/.test(c.id);
const demoChip = c => isDemo(c) ? ' <span class="chip" title="Demo data: never emailed">Demo</span>' : '';

async function run(btn, fn) { // disables a button while a request runs; shows errors as toasts
  if (btn) btn.disabled = true;
  try { return await fn(); } catch (e) { if (e.message === 'SESSION_EXPIRED') return signOut('Your session expired. Please sign in again.'); toast(e.message); throw e; } finally { if (btn) btn.disabled = false; }
}

/* ---------- attention rules: what needs someone today ---------- */
function attention(list) {
  const out = [];
  for (const c of list.filter(OPEN)) {
    if (c.stage === 'new' && days(c.created) >= 3) out.push({ c, w: 5, icon: 'mark_email_unread', col: '#E8892B', why: `Waiting ${days(c.created)} days for review`, act: 'review', label: 'Start review' });
    if (c.touchpointDate && new Date(c.touchpointDate) < Date.now() - DAY / 2 && LIVE(c)) out.push({ c, w: 4, icon: 'event_busy', col: '#C0504D', why: `Touchpoint overdue: ${c.touchpointLabel || 'meeting'} (${fmt(c.touchpointDate)})`, act: 'open', label: 'Reschedule' });
    if (!c.owner && c.stage !== 'new') out.push({ c, w: 3, icon: 'person_off', col: '#7B63A6', why: 'No owner assigned', act: 'claim', label: 'Assign to me' });
    if (LIVE(c) && c.stage !== 'new' && days(c.stageAt) > 7) out.push({ c, w: 2, icon: 'hourglass_bottom', col: '#B98A55', why: `${days(c.stageAt)} days in ${ST[c.stage].label}`, act: 'open', label: 'Review' });
    if (c.touchpointDate && new Date(c.touchpointDate) >= Date.now() - DAY / 2 && new Date(c.touchpointDate) - Date.now() < 3 * DAY) out.push({ c, w: 1, icon: 'event_upcoming', col: '#3FA796', why: `${c.touchpointLabel || 'Touchpoint'} on ${fmt(c.touchpointDate)}`, act: 'open', label: 'Prepare' });
  }
  out.sort((a, b) => b.w - a.w);
  return me.role === 'Admin' ? out : out.filter(a => [a.c.owner, a.c.facultyMentor].includes(me.email) || !a.c.owner); // coordinators: theirs + unclaimed
}

/* ---------- auth screens ---------- */
function authShell(inner) { app.innerHTML = `<div class="auth"><form class="box" novalidate>${inner}</form></div>`; return $('form', app); }
function showLogin(msg = '') {
  const f = authShell(`<img src="../../assets/weschool-logo.png" alt="WeSchool">
    <div><div class="kick">GCL team</div><h1>Command Centre</h1><small>Track every partner challenge, act on what needs attention and keep stakeholders in the loop.</small></div>
    <label class="f">Email<input name="email" type="email" autocomplete="username" required></label>
    <label class="f">Password<input name="pass" type="password" autocomplete="current-password" required></label>
    <p class="err">${esc(msg)}</p><button class="btn">${ms('login')}Sign in</button>
    <small>New teammate? Use the invite link from your email. Forgot your password? Ask an Admin to resend your invite.</small>`);
  f.email.focus();
  f.onsubmit = async e => {
    e.preventDefault();
    try { const r = await run($('button', f), () => api('login', f.email.value, f.pass.value)); signedIn(r); }
    catch (err) { $('.err', f).textContent = err.message; }
  };
}
function showInvite(code) {
  const f = authShell(`<img src="../../assets/weschool-logo.png" alt="WeSchool">
    <div><div class="kick">Welcome to the GCL team</div><h1>Set your password</h1><small>At least 8 characters. You will use it with your email to sign in.</small></div>
    <label class="f">New password<input name="p1" type="password" autocomplete="new-password" minlength="8" required></label>
    <label class="f">Repeat password<input name="p2" type="password" autocomplete="new-password" required></label>
    <p class="err"></p><button class="btn">${ms('check')}Save and sign in</button>`);
  f.onsubmit = async e => {
    e.preventDefault();
    if (f.p1.value !== f.p2.value) return ($('.err', f).textContent = 'The passwords do not match.');
    try { const r = await run($('button', f), () => api('acceptInvite', code, f.p1.value)); history.replaceState(null, '', location.pathname); signedIn(r); }
    catch (err) { $('.err', f).textContent = err.message; }
  };
}
function signedIn(r) { token = r.token; sessionStorage.setItem('gclToken', token); me = r.user; load(); }
function signOut(msg) { if (token) api('logout', token).catch(() => {}); token = null; me = null; D = null; sessionStorage.removeItem('gclToken'); drawer.close(); modal.close(); showLogin(msg); }

/* ---------- data ---------- */
async function load(quiet) {
  if (!quiet) app.innerHTML = '<div class="loading">Loading the Command Centre…</div>';
  try { D = await api('getDashboard', token); me = D.me; }
  catch (e) { return e.message === 'SESSION_EXPIRED' ? signOut() : (app.innerHTML = `<div class="loading">${esc(e.message)} <button class="btn soft" onclick="location.reload()">Retry</button></div>`); }
  D.challenges.forEach(c => { c.org = String(c.organisation).replace(/^'/, ''); });
  route();
}
async function refresh() { await load(true); if (openId) openChallenge(openId, true); else if (openPersonId && drawer.open) openPerson(openPersonId); }

/* ---------- shell + routing ---------- */
const VIEWS = [['home', 'space_dashboard', 'Command Centre'], ['pipeline', 'view_kanban', 'Pipeline'], ['challenges', 'table_rows', 'Challenges'], ['people', 'diversity_3', 'People'], ['tasks', 'task_alt', 'Tasks'], ['partners', 'handshake', 'Partners'], ['team', 'group', 'Team']];
function route() {
  const h = location.hash.slice(1);
  if (h.startsWith('c=')) { openId = h.slice(2); if (!VIEWS.some(v => v[0] === view)) view = 'home'; }
  else if (VIEWS.some(v => v[0] === h)) view = h;
  render();
  if (h.startsWith('c=')) openChallenge(h.slice(2));
}
addEventListener('hashchange', () => D && route());

function render() {
  const att = attention(D.challenges);
  const title = { home: ['Command Centre', `${D.challenges.filter(LIVE).length} live challenges · updated ${new Date(D.generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`], pipeline: ['Pipeline', 'Drag a card to move it to the next stage'], challenges: ['Challenges', 'Every challenge, searchable and exportable'], people: ['People', 'Students, faculty, companies, mentors and other stakeholders'], tasks: ['Tasks', 'Work assigned to people and teams, with deadlines and progress'], partners: ['Partners', 'Companies who brought us challenges'], team: ['Team', me.role === 'Admin' ? 'Who can sign in, and what they own' : 'Your GCL teammates'] }[view];
  Object.values(charts).forEach(ch => ch.destroy()); for (const k in charts) delete charts[k];
  app.innerHTML = `<div class="shell">
    <nav class="side" aria-label="Sections">
      <div class="brand"><img src="../../assets/weschool-logo.png" alt="WeSchool"><div><b>GCL Command Centre</b><small>Global Citizen Leaders</small></div></div>
      ${VIEWS.map(([k, i, l]) => `<a class="nav ${view === k ? 'on' : ''}" href="#${k}">${ms(i)}<span>${l}</span>${k === 'home' && att.length ? `<span class="n">${att.length}</span>` : ''}</a>`).join('')}
      <div class="grow"></div>
      <a class="nav" href="../" target="_blank" rel="noopener">${ms('travel_explore')}<span>Open GCL Campus</span></a>
      <div class="me"><span class="av">${initials(me.name)}</span><div><b>${esc(me.name)}</b><small>${esc(me.role)}</small></div><button class="icon" data-act="signout" title="Sign out" aria-label="Sign out">${ms('logout')}</button></div>
    </nav>
    <div class="main">
      <div class="top"><h1>${title[0]}<small>${title[1]}</small></h1>
        <label class="search">${ms('search')}<input id="q" type="search" placeholder="Search organisation, ID, contact…" value="${esc(F.q)}" aria-label="Search challenges"></label>
        <button class="icon" data-act="refresh" title="Refresh" aria-label="Refresh">${ms('refresh')}</button><button class="icon phone" data-act="signout" title="Sign out" aria-label="Sign out">${ms('logout')}</button>
      </div>
      <div class="page" id="page"></div>
    </div></div>`;
  ({ home: renderHome, pipeline: renderPipeline, challenges: renderTable, people: renderPeople, tasks: renderTasks, partners: renderPartners, team: renderTeam })[view](att);
  $('#q').oninput = e => { F.q = e.target.value; if (view === 'people') return renderPeople(); if (view === 'tasks') return renderTasksOut(); if (view !== 'challenges') { location.hash = 'challenges'; setTimeout(() => $('#q')?.focus(), 0); } else renderTable(); };
}

/* ---------- Command Centre ---------- */
function renderHome(att) {
  const C = D.challenges, now = Date.now();
  const fresh = C.filter(c => now - new Date(c.created) < 7 * DAY), live = C.filter(LIVE);
  const awaiting = C.filter(c => ['new', 'review'].includes(c.stage));
  const soon = C.filter(c => LIVE(c) && c.touchpointDate && new Date(c.touchpointDate) - now < 14 * DAY && new Date(c.touchpointDate) - now > -DAY / 2);
  const done = C.filter(c => c.stage === 'completed'), closed = C.filter(c => !OPEN(c));
  const mentors = C.filter(c => c.mentor === 'Yes');
  const kpi = (ic, bg, fg, l, v, s, go) => `<button class="kpi" data-go="${go}"><span class="ic" style="background:${bg};color:${fg}">${ms(ic)}</span><div><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div></button>`;
  const mine = att;
  const agenda = soon.concat(C.filter(c => LIVE(c) && c.touchpointDate && new Date(c.touchpointDate) < now - DAY / 2)).sort((a, b) => new Date(a.touchpointDate) - new Date(b.touchpointDate)).slice(0, 8);
  $('#page').innerHTML = `
    <section class="kpis" aria-label="Key numbers">
      ${kpi('fiber_new', '#FFF3E6', '#9A5413', 'New this week', fresh.length, `${C.length} received in total`, 'stage:new')}
      ${kpi('rocket_launch', '#F1EEF7', '#66518A', 'Live challenges', live.length, `${C.filter(c => c.stage === 'hold').length} on hold`, 'pipeline')}
      ${kpi('rate_review', '#FBECEB', '#C0504D', 'Awaiting review', awaiting.length, awaiting.length ? `oldest ${Math.max(...awaiting.map(c => days(c.created)))}d` : 'all clear', 'stage:review')}
      ${kpi('event', '#E5F4F1', '#2C7A6C', 'Touchpoints · 14 days', soon.length, 'meetings with companies', 'home')}
      ${kpi('volunteer_activism', '#EAF4DD', '#3F5E1C', 'Mentor opt-ins', mentors.length, `${Math.round(mentors.length / Math.max(1, C.length) * 100)}% of companies`, 'challenges')}
      ${kpi('verified', '#EAF4DD', '#3F5E1C', 'Completed', done.length, closed.length ? `${Math.round(done.length / closed.length * 100)}% of closed` : 'none closed yet', 'stage:completed')}
    </section>
    <div class="grid">
      <section class="card s7"><header>${ms('notification_important')}<h3>Needs attention</h3><small>${mine.length} item${mine.length === 1 ? '' : 's'}</small></header>
        ${mine.length ? `<ul class="att">${mine.slice(0, 9).map((a, i) => `<li><span class="k" style="background:${a.col}1F;color:${a.col}">${ms(a.icon)}</span>
          <div class="why linkrow" data-open="${a.c.id}"><b>${org(a.c)} <small>${a.c.id}</small></b><small>${esc(a.why)} · ${ST[a.c.stage].label}</small></div>
          ${avatar(a.c.owner)}<button class="btn sm ${a.w >= 4 ? '' : 'soft'}" data-att="${i}">${a.label}</button></li>`).join('')}</ul>`
          : `<p class="empty">${ms('task_alt')} Nothing needs attention. Nice work.</p>`}
      </section>
      <section class="card s5"><header>${ms('event_upcoming')}<h3>Upcoming touchpoints</h3></header>
        ${agenda.length ? `<ul class="agenda">${agenda.map(c => { const d = new Date(c.touchpointDate), late = d < now - DAY / 2; return `<li class="linkrow" data-open="${c.id}"><span class="date ${late ? 'late' : ''}"><small>${d.toLocaleDateString('en-IN', { month: 'short' })}</small><b>${d.getDate()}</b></span><div style="flex:1;min-width:0"><b>${esc(c.touchpointLabel || 'Touchpoint')}</b><br><small>${org(c)} · ${late ? 'overdue' : d.toLocaleDateString('en-IN', { weekday: 'long' })}</small></div>${avatar(c.owner)}</li>`; }).join('')}</ul>` : '<p class="empty">No touchpoints scheduled.</p>'}
      </section>
      <section class="card s8"><header>${ms('filter_alt')}<h3>Pipeline</h3><small>challenges in each stage</small></header><div class="chartbox"><canvas id="chFunnel"></canvas></div></section>
      <section class="card s4"><header>${ms('donut_large')}<h3>By challenge type</h3></header><div class="chartbox"><canvas id="chType"></canvas></div></section>
      <section class="card s6"><header>${ms('trending_up')}<h3>Submissions</h3><small>last 12 weeks</small></header><div class="chartbox"><canvas id="chTrend"></canvas></div></section>
      <section class="card s6"><header>${ms('groups')}<h3>Workload by owner</h3><small>live challenges</small></header><div class="chartbox"><canvas id="chOwner"></canvas></div></section>
      <section class="card s5"><header>${ms('assignment_late')}<h3>Task deadlines</h3><small>overdue and next 7 days</small><a href="#tasks" class="btn ghost sm">All tasks</a></header>${(() => { const due = D.tasks.filter(t => isLate(t) || dueSoon(t, 7)).sort((a, b) => new Date(a.due) - new Date(b.due)).slice(0, 8); return due.length ? `<ul class="agenda">${due.map(t => { const d = new Date(t.due); return `<li class="linkrow" data-task="${t.id}"><span class="date ${isLate(t) ? 'late' : ''}"><small>${d.toLocaleDateString('en-IN', { month: 'short' })}</small><b>${d.getDate()}</b></span><div style="flex:1;min-width:0"><b>${esc(t.title)}</b><br><span class="row">${bar(t.progress, isLate(t))}<small>${Number(t.progress) || 0}% · ${TS[t.status].label}</small></span></div><span class="row" style="gap:2px">${whoLabel(t)}</span></li>`; }).join('')}</ul>` : '<p class="empty">No task deadlines this week.</p>'; })()}</section>
      <section class="card s7"><header>${ms('history')}<h3>Recent activity</h3><small>everything the team did, newest first</small></header>${feed(D.activity.slice(0, 12), true)}</section>
    </div>`;
  $$('[data-att]').forEach(b => b.onclick = () => actOn(mine[b.dataset.att], b));
  $$('[data-go]').forEach(b => b.onclick = () => { const g = b.dataset.go; if (g.startsWith('stage:')) { Object.assign(F, { stage: g.slice(6), type: '', owner: '', priority: '', q: '' }); location.hash = 'challenges'; } else location.hash = g; });
  bindTaskRows($('#page'));
  drawCharts(C);
}

function feed(list, withOrg) {
  const icon = { stage: 'swap_horiz', note: 'sticky_note_2', email: 'mail', assign: 'person_add', touchpoint: 'event', edit: 'edit', task: 'task_alt' };
  if (!list.length) return '<p class="empty">No activity yet.</p>';
  return `<ul class="feed">${list.map(a => { const c = D.challenges.find(x => x.id === a.challengeId); return `<li>${ms(icon[a.kind] || 'bolt')}<div style="flex:1;min-width:0"><p><b>${esc(a.user)}</b> ${withOrg && c ? `· <a href="#c=${c.id}">${org(c)}</a>` : ''}</p><p>${esc(a.detail)}</p></div><small>${ago(a.at)}</small></li>`; }).join('')}</ul>`;
}

function drawCharts(C) {
  if (!window.Chart) return setTimeout(() => view === 'home' && drawCharts(C), 300);
  Chart.defaults.font.family = 'Inter, system-ui, sans-serif'; Chart.defaults.color = '#7A7590';
  const grid = { color: '#F1EFF6' }, noLegend = { legend: { display: false } };
  const mk = (id, cfg) => { const el = $('#' + id); if (el) charts[id] = new Chart(el, { ...cfg, options: { responsive: true, maintainAspectRatio: false, ...cfg.options } }); };
  mk('chFunnel', { type: 'bar', data: { labels: STAGES.map(s => s.label), datasets: [{ data: STAGES.map(s => C.filter(c => c.stage === s.key).length), backgroundColor: STAGES.map(s => s.color), borderRadius: 6 }] },
    options: { plugins: noLegend, scales: { x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 40, font: { size: 10.5 } } }, y: { grid, ticks: { precision: 0 } } },
      onClick: (e, els) => { if (els[0]) { Object.assign(F, { stage: STAGES[els[0].index].key, type: '', owner: '', priority: '', q: '' }); location.hash = 'challenges'; } } } });
  const types = TYPES.map(t => C.filter(c => c.type === t).length);
  mk('chType', { type: 'doughnut', data: { labels: TYPES, datasets: [{ data: types, backgroundColor: ['#66518A', '#3FA796', '#7AA342', '#E8892B', '#4F86C6', '#B98A55'], borderWidth: 2 }] },
    options: { cutout: '62%', plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } } } } });
  const weeks = Array.from({ length: 12 }, (_, i) => Date.now() - (11 - i) * 7 * DAY);
  mk('chTrend', { type: 'bar', data: { labels: weeks.map(w => new Date(w).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })),
    datasets: [{ data: weeks.map(w => C.filter(c => { const t = new Date(c.created); return t <= w && t > w - 7 * DAY; }).length), backgroundColor: '#E8892B', borderRadius: 6 }] },
    options: { plugins: noLegend, scales: { x: { grid: { display: false } }, y: { grid, ticks: { precision: 0 } } } } });
  const owners = D.users.filter(u => u.active).map(u => u.email);
  mk('chOwner', { type: 'bar', data: { labels: [...owners.map(userName), 'Unassigned'], datasets: [{ data: [...owners.map(e => C.filter(c => LIVE(c) && c.owner === e).length), C.filter(c => LIVE(c) && !c.owner).length], backgroundColor: [...owners.map(colorOf), '#D3CEE0'], borderRadius: 6 }] },
    options: { indexAxis: 'y', plugins: noLegend, scales: { x: { grid, ticks: { precision: 0 } }, y: { grid: { display: false } } } } });
}

async function actOn(a, btn) {
  if (a.act === 'open') return (location.hash = 'c=' + a.c.id);
  if (a.act === 'claim') { await run(btn, () => api('updateChallenge', token, a.c.id, { owner: me.email })); toast(`${a.c.id} is now yours`); return refresh(); }
  if (a.act === 'review') return moveStage(a.c, 'review');
}

/* ---------- Pipeline (Kanban) ---------- */
function renderPipeline() {
  const list = filtered(false);
  $('#page').innerHTML = `<div class="board">${STAGES.map(s => { const cs = list.filter(c => c.stage === s.key); return `<section class="col" data-stage="${s.key}" aria-label="${s.label}"><header><i style="background:${s.color}"></i>${s.label}<span>${cs.length}</span></header><div class="cards">${cs.map(card).join('')}</div></section>`; }).join('')}</div>`;
  let dragId = null;
  $$('.kc').forEach(k => {
    k.onclick = () => (location.hash = 'c=' + k.dataset.id);
    k.ondragstart = e => { dragId = k.dataset.id; k.classList.add('dragging'); e.dataTransfer.setData('text/plain', dragId); };
    k.ondragend = () => { k.classList.remove('dragging'); $$('.col').forEach(c => c.classList.remove('over')); };
  });
  $$('.col').forEach(col => {
    col.ondragover = e => { if (dragId) { e.preventDefault(); col.classList.add('over'); } };
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = e => { e.preventDefault(); col.classList.remove('over'); const c = D.challenges.find(x => x.id === dragId); dragId = null; if (c && c.stage !== col.dataset.stage) moveStage(c, col.dataset.stage); };
  });
}
function card(c) {
  const stale = LIVE(c) && days(c.stageAt) > 7, tp = c.touchpointDate && LIVE(c);
  return `<button class="kc" data-id="${c.id}" draggable="${canEdit(c)}" title="${canEdit(c) ? 'Drag to move · click to open' : 'Click to open'}">
    <span class="t"><span class="pri ${esc(c.priority)}" title="${esc(c.priority)} priority"></span><b>${org(c)}</b>${avatar(c.owner)}</span>
    <span class="d">${esc(c.challenge)}</span>
    <span class="m"><span>${c.id}</span><span class="grow"></span>${tp ? `${ms('event')}${new Date(c.touchpointDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}<span class="${stale ? 'stale' : ''}">${days(c.stageAt)}d</span>${canEdit(c) ? '' : ms('lock')}</span></button>`;
}

/* ---------- Stage change: confirm, optional email to the company ---------- */
function moveStage(c, stage) {
  if (!canEdit(c)) return toast('Only the owner, the faculty mentor or an Admin can move this challenge.');
  const notifyDefault = !['hold', 'review'].includes(stage);
  modal.innerHTML = `<form method="dialog">
    <div class="mh"><div class="kick">${c.id} · ${org(c)}</div><h2>Move to ${ST[stage].label}?</h2><small>From ${ST[c.stage].label}. This is logged and shown on the company's tracker.</small></div>
    <div class="mb">
      ${stage === 'declined' || stage === 'hold' ? `<label class="f">Reason (internal)<input name="reason" placeholder="e.g. out of scope this cycle"></label>` : ''}
      <label class="check"><input type="checkbox" name="notify" ${notifyDefault ? 'checked' : ''}> Email ${esc(c.name)} an update</label>
      <label class="f">Personal note in the email (optional)<textarea name="message" rows="3" placeholder="e.g. Kick-off is on Tuesday at 4pm, we will send an invite."></textarea></label>
      <div><button type="button" class="btn ghost sm" data-prev>${ms('visibility')}Preview email</button></div><div class="preview" hidden></div>
      <p class="err"></p>
    </div>
    <div class="mf"><button class="btn ghost" value="cancel">Cancel</button><button class="btn" value="ok" data-ok>${ms('swap_horiz')}Move</button></div></form>`;
  const f = $('form', modal), pv = $('.preview', modal);
  $('[data-prev]', modal).onclick = async e => { const m = await run(e.currentTarget, () => api('previewEmail', token, c.id, stage, f.message.value)); pv.hidden = false; pv.textContent = `To: ${m.to}\nSubject: ${m.subject}\n\n${m.body}`; };
  $('[data-ok]', modal).onclick = async e => {
    e.preventDefault();
    try {
      await run(e.currentTarget, () => api('setStage', token, c.id, stage, { notify: f.notify.checked, message: f.message.value, reason: f.reason?.value }));
      modal.close(); toast(`${c.id} moved to ${ST[stage].label}${f.notify.checked ? ' · company emailed' : ''}`); refresh();
    } catch (err) { $('.err', modal).textContent = err.message; }
  };
  modal.showModal();
}

/* ---------- Challenges table ---------- */
function filtered(useStage = true) {
  const q = F.q.trim().toLowerCase();
  return D.challenges.filter(c => (!q || [c.id, c.org, c.name, c.email, c.type, c.challenge, c.studentTeam, c.facultyMentor, c.tags].join(' ').toLowerCase().includes(q))
    && (!useStage || !F.stage || c.stage === F.stage) && (!F.type || c.type === F.type) && (!F.priority || c.priority === F.priority)
    && (!F.owner || (F.owner === '-' ? !c.owner : F.owner === 'me' ? [c.owner, c.facultyMentor].includes(me.email) : c.owner === F.owner)));
}
function renderTable() {
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
  const COLS = [['id', 'ID'], ['org', 'Organisation'], ['type', 'Type'], ['stage', 'Stage'], ['owner', 'Owner'], ['priority', 'Priority'], ['touchpointDate', 'Next touchpoint'], ['updated', 'Updated']];
  const rank = { stage: c => ST[c.stage].i, priority: c => ['High', 'Medium', 'Low'].indexOf(c.priority), owner: c => userName(c.owner) };
  const rows = filtered().sort((a, b) => { const g = rank[F.sort] || (c => c[F.sort] || ''); const x = g(a), y = g(b); return (x > y ? 1 : x < y ? -1 : 0) * F.dir; });
  const page = $('#page');
  if (!$('.filters', page)) page.innerHTML = `<section class="card"><div class="filters">
      <label class="f">Stage<select data-f="stage">${opt('', 'All stages', F.stage)}${STAGES.map(s => opt(s.key, s.label, F.stage)).join('')}</select></label>
      <label class="f">Type<select data-f="type">${opt('', 'All types', F.type)}${TYPES.map(t => opt(t, t, F.type)).join('')}</select></label>
      <label class="f">Owner<select data-f="owner">${opt('', 'Anyone', F.owner)}${opt('me', 'Mine', F.owner)}${opt('-', 'Unassigned', F.owner)}${D.users.map(u => opt(u.email, u.name, F.owner)).join('')}</select></label>
      <label class="f">Priority<select data-f="priority">${opt('', 'Any', F.priority)}${['High', 'Medium', 'Low'].map(p => opt(p, p, F.priority)).join('')}</select></label>
      <span style="flex:1"></span><button class="btn ghost" data-act="reset">${ms('filter_alt_off')}Reset</button><button class="btn soft" data-act="csv">${ms('download')}Export CSV</button>
    </div></section><section class="card scroll" id="tbl"></section>`;
  $$('[data-f]', page).forEach(s => s.onchange = () => { F[s.dataset.f] = s.value; renderTable(); });
  $('#tbl').innerHTML = rows.length ? `<table class="tbl"><thead><tr>${COLS.map(([k, l]) => `<th data-sort="${k}" class="${F.sort === k ? 'sorted' : ''}" aria-sort="${F.sort === k ? (F.dir > 0 ? 'ascending' : 'descending') : 'none'}">${l}${F.sort === k ? (F.dir > 0 ? ' ↑' : ' ↓') : ''}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(c => `<tr data-open="${c.id}"><td><small>${c.id}</small></td><td><div class="org">${orgTile(c)}<div><b>${org(c)}${demoChip(c)}</b><small>${esc(c.name)}${c.mentor === 'Yes' ? ' · mentor' : ''}</small></div></div></td>
      <td><small>${esc(c.type)}</small></td><td>${stageChip(c.stage)}</td><td>${c.owner ? `<span class="row">${avatar(c.owner)}<small>${esc(userName(c.owner))}</small></span>` : '<small>—</small>'}</td>
      <td><span class="row"><span class="pri ${esc(c.priority)}"></span>${esc(c.priority)}</span></td><td><small>${c.touchpointDate && OPEN(c) ? esc(c.touchpointLabel || '') + '<br>' + fmt(c.touchpointDate) : '—'}</small></td><td><small>${ago(c.updated)}</small></td></tr>`).join('')}
    </tbody></table><p class="muted" style="padding:10px 4px 0">${rows.length} of ${D.challenges.length} challenges</p>` : '<p class="empty">No challenges match these filters.</p>';
  $$('#tbl th').forEach(th => th.onclick = () => { F.dir = F.sort === th.dataset.sort ? -F.dir : 1; F.sort = th.dataset.sort; renderTable(); });
}
function exportCsv() {
  const cols = ['id', 'created', 'organisation', 'name', 'designation', 'email', 'phone', 'type', 'challenge', 'link', 'mentor', 'stage', 'priority', 'owner', 'facultyMentor', 'industryMentor', 'studentTeam', 'touchpointDate', 'touchpointLabel', 'updated'];
  const cell = v => { let s = String(v ?? ''); if (/^[=+\-@]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = [cols.join(','), ...filtered().map(c => cols.map(k => cell(k === 'stage' ? ST[c.stage].label : c[k])).join(','))].join('\n');
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })), download: `gcl-challenges-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click(); URL.revokeObjectURL(a.href);
}

/* ---------- Partners ---------- */
function renderPartners() {
  const by = {};
  D.challenges.forEach(c => { const k = c.org.trim().toLowerCase(); (by[k] ||= []).push(c); });
  const list = Object.values(by).filter(cs => !F.q || cs.some(c => [c.org, c.name, c.email].join(' ').toLowerCase().includes(F.q.toLowerCase()))).sort((a, b) => b.length - a.length || new Date(b[0].created) - new Date(a[0].created));
  $('#page').innerHTML = `<section class="card scroll">${list.length ? `<table class="tbl"><thead><tr><th>Organisation</th><th>Contacts</th><th>Challenges</th><th>Latest stage</th><th>Mentor</th><th>First contact</th></tr></thead><tbody>
    ${list.map(cs => { const latest = cs.slice().sort((a, b) => new Date(b.created) - new Date(a.created))[0]; return `<tr data-partner="${esc(latest.org)}"><td><div class="org">${orgTile(latest)}<div><b>${org(latest)}</b><small>${esc(latest.email.split('@')[1] || '')}</small></div></div></td>
      <td><small>${[...new Set(cs.map(c => c.name))].map(esc).join('<br>')}</small></td><td><b>${cs.length}</b>${cs.length > 1 ? ' <span class="chip green">repeat partner</span>' : ''}</td>
      <td>${stageChip(latest.stage)}</td><td>${cs.some(c => c.mentor === 'Yes') ? '<span class="chip purple">Yes</span>' : '<small>—</small>'}</td><td><small>${fmt(cs.reduce((m, c) => new Date(c.created) < new Date(m) ? c.created : m, latest.created))}</small></td></tr>`; }).join('')}
    </tbody></table>` : '<p class="empty">No partners yet.</p>'}</section>`;
  $$('[data-partner]').forEach(r => r.onclick = () => { Object.assign(F, { q: r.dataset.partner, stage: '', type: '', owner: '', priority: '' }); location.hash = 'challenges'; });
}

/* ---------- Team ---------- */
function renderTeam() {
  const admin = me.role === 'Admin';
  $('#page').innerHTML = `<div class="grid">
    <section class="card ${admin ? 's8' : 's12'} scroll"><header>${ms('group')}<h3>People</h3></header><table class="tbl"><thead><tr><th>Name</th><th>Role</th><th>Live challenges</th><th>Status</th>${admin ? '<th></th>' : ''}</tr></thead><tbody>
      ${D.users.map(u => `<tr style="cursor:default"><td><div class="org"><span class="av" style="background:${colorOf(u.email)};width:32px;height:32px">${initials(u.name)}</span><div><b>${esc(u.name)}</b><small>${esc(u.email)}</small></div></div></td>
        <td>${admin && u.email !== me.email ? `<select data-role="${esc(u.email)}" style="width:auto">${['Admin', 'Coordinator'].map(r => `<option ${r === u.role ? 'selected' : ''}>${r}</option>`).join('')}</select>` : `<span class="chip ${u.role === 'Admin' ? 'purple' : ''}">${u.role}</span>`}</td>
        <td>${D.challenges.filter(c => LIVE(c) && (c.owner === u.email || c.facultyMentor === u.email)).length}</td><td>${u.active ? '<span class="chip green">Active</span>' : '<span class="chip">Deactivated</span>'}</td>
        ${admin ? `<td class="row">${u.email !== me.email ? `<button class="btn ghost sm" data-toggle="${esc(u.email)}">${u.active ? 'Deactivate' : 'Reactivate'}</button><button class="btn ghost sm" data-resend="${esc(u.email)}" title="Email a new set-password link">Resend invite</button>` : '<small>you</small>'}</td>` : ''}</tr>`).join('')}
    </tbody></table></section>
    ${admin ? `<section class="card s4"><header>${ms('person_add')}<h3>Add a teammate</h3></header><form id="addUser" style="display:flex;flex-direction:column;gap:10px" novalidate>
      <label class="f">Email<input name="email" type="email" required></label><label class="f">Name<input name="name" required></label>
      <label class="f">Role<select name="role"><option>Coordinator</option><option>Admin</option></select></label>
      <small>They get an email with a link to set their own password. Coordinators can act on challenges they own or mentor, and claim unassigned ones.</small>
      <button class="btn">${ms('send')}Send invite</button></form></section>
    <section class="card s12"><header>${ms('science')}<h3>Demo data</h3><small>${D.challenges.filter(isDemo).length ? D.challenges.filter(isDemo).length + ' demo challenges loaded' : 'not loaded'}</small></header>
      <div class="row"><p class="muted grow">About 38 realistic sample challenges with history, touchpoints and three demo teammates, for showing the Command Centre. They are labelled "Demo", use reserved .example emails (nothing is ever sent to them), and remove in one click without touching real challenges.</p>
      ${D.challenges.some(isDemo) ? `<button class="btn ghost" data-demo="remove">${ms('delete_sweep')}Remove demo data</button>` : `<button class="btn soft" data-demo="load">${ms('science')}Load demo data</button>`}</div></section>` : ''}</div>`;
  if (!admin) return;
  const save = async (u, btn, msg) => { await run(btn, () => api('saveUser', token, u)); toast(msg); refresh(); };
  const find = e => D.users.find(u => u.email === e);
  $$('[data-role]').forEach(s => s.onchange = () => save({ ...find(s.dataset.role), role: s.value }, s, 'Role updated'));
  $$('[data-toggle]').forEach(b => b.onclick = () => { const u = find(b.dataset.toggle); save({ ...u, active: !u.active }, b, u.active ? 'Deactivated' : 'Reactivated'); });
  $$('[data-resend]').forEach(b => b.onclick = () => save({ ...find(b.dataset.resend), resendInvite: true }, b, 'Invite sent'));
  $$('[data-demo]').forEach(b => b.onclick = async () => {
    const load = b.dataset.demo === 'load';
    if (!load && !confirm('Remove all demo challenges, their history and demo teammates? Real challenges are not touched.')) return;
    b.textContent = load ? 'Loading demo data…' : 'Removing…';
    const r = await run(b, () => api(load ? 'loadDemoData' : 'removeDemoData', token));
    toast(load ? `Loaded ${r.challenges} demo challenges` : `Removed ${r.challenges} demo challenges`); refresh();
  });
  $('#addUser').onsubmit = e => { e.preventDefault(); const f = e.target; if (!f.reportValidity()) return; save({ email: f.email.value, name: f.name.value, role: f.role.value, active: true }, $('button', f), 'Invite sent to ' + f.email.value); };
}

/* ---------- Challenge drawer ---------- */
function openChallenge(id, keepScroll) {
  const c = D.challenges.find(x => x.id === id);
  if (!c) { toast(`Challenge ${id} not found`); return closeDrawer(); }
  openId = id; openPersonId = null;
  const edit = canEdit(c), claim = !c.owner && !edit;
  const ctasks = D.tasks.filter(t => t.challengeId === id).sort((a, b) => (a.status === 'done') - (b.status === 'done') || new Date(a.due || 8e15) - new Date(b.due || 8e15));
  const cpeople = D.people.filter(p => p.active && (String(p.challengeIds).split(',').map(x => x.trim()).includes(id) || (c.studentTeam && p.team === c.studentTeam)));
  const acts = D.activity.filter(a => a.challengeId === id);
  const pi = PATH.findIndex(s => s.key === c.stage);
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
  const dis = edit ? '' : 'disabled';
  const top = drawer.scrollTop;
  drawer.innerHTML = `<div class="dw-h">${orgTile(c, true)}<div class="t"><div class="kick">${c.id} · ${esc(c.type)}</div><h2>${org(c)}${demoChip(c)}</h2>
      <div class="row" style="margin-top:6px">${stageChip(c.stage)}<span class="chip"><span class="pri ${esc(c.priority)}"></span>${esc(c.priority)}</span><small>${days(c.stageAt)} days in stage · received ${fmt(c.created)}</small></div></div>
      <button class="icon" data-act="close" aria-label="Close">${ms('close')}</button></div>
    <div class="dw-b">
      <section class="sec"><h4>Progress<span>${pi >= 0 ? `step ${pi + 1} of ${PATH.length}` : ST[c.stage].label}</span></h4>
        <div class="stepper">${PATH.map((s, i) => `<button ${dis} class="${i < pi ? 'done' : i === pi ? 'cur' : ''}" data-stage="${s.key}" data-label="${s.label}" aria-label="Move to ${s.label}"></button>`).join('')}</div>
        <div class="stepnames"><span>${PATH[0].label}</span><span>${pi >= 0 ? ST[c.stage].label : ''}</span><span>${PATH.at(-1).label}</span></div>
        ${edit ? `<div class="row" style="margin-top:12px">${pi >= 0 && pi < PATH.length - 1 ? `<button class="btn sm" data-stage="${PATH[pi + 1].key}">${ms('arrow_forward')}Move to ${PATH[pi + 1].label}</button>` : ''}
          ${c.stage !== 'hold' && OPEN(c) ? `<button class="btn ghost sm" data-stage="hold">${ms('pause')}Hold</button>` : ''}${OPEN(c) ? `<button class="btn ghost sm" data-stage="declined">${ms('block')}Decline</button>` : ''}
          ${!OPEN(c) || c.stage === 'hold' ? `<button class="btn ghost sm" data-stage="review">${ms('undo')}Reopen</button>` : ''}</div>` : ''}
      </section>
      ${claim ? `<p class="quote">${ms('info')} You can view this challenge. Claim it to work on it. <button class="btn sm" data-act="claim">Assign to me</button></p>` : ''}
      <section class="sec"><h4>The challenge</h4><p class="quote">${esc(c.challenge)}</p>${c.link ? `<p style="margin-top:8px"><a href="${esc(c.link)}" target="_blank" rel="noopener noreferrer">${ms('link')} Supporting link</a></p>` : ''}</section>
      <section class="sec"><h4>Company contact</h4><dl class="kv"><dt>Name</dt><dd>${esc(c.name)}${c.designation ? ', ' + esc(c.designation) : ''}</dd><dt>Email</dt><dd><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></dd>${c.phone ? `<dt>Phone</dt><dd><a href="tel:${esc(c.phone)}">${esc(c.phone)}</a></dd>` : ''}<dt>Wants to mentor</dt><dd>${c.mentor === 'Yes' ? 'Yes' : 'No'}</dd></dl></section>
      <section class="sec"><h4>Team & ownership</h4><form id="assign" class="form2">
        <label class="f">Owner<select name="owner" ${dis}>${opt('', 'Unassigned', c.owner)}${D.users.filter(u => u.active || u.email === c.owner).map(u => opt(u.email, u.name, c.owner)).join('')}</select></label>
        <label class="f">Priority<select name="priority" ${dis}>${['High', 'Medium', 'Low'].map(p => opt(p, p, c.priority)).join('')}</select></label>
        <label class="f">Faculty mentor<input name="facultyMentor" list="people" value="${esc(c.facultyMentor)}" ${dis} placeholder="Name or teammate email"></label>
        <label class="f">Industry mentor<input name="industryMentor" value="${esc(c.industryMentor)}" ${dis}></label>
        <label class="f">Student team<input name="studentTeam" value="${esc(c.studentTeam)}" ${dis} placeholder="e.g. Team Sustain X"></label>
        <label class="f">Tags<input name="tags" value="${esc(c.tags)}" ${dis} placeholder="e.g. fintech, pilot"></label>
        <datalist id="people">${D.users.map(u => `<option value="${esc(u.email)}">${esc(u.name)}</option>`).join('')}</datalist>
        ${edit ? '<div class="row" style="grid-column:1/-1"><span class="grow"></span><button class="btn soft sm">Save changes</button></div>' : ''}</form></section>
      <section class="sec"><h4>Next touchpoint<span>shared with the company</span></h4><form id="tp" class="form2">
        <label class="f">What<input name="touchpointLabel" value="${esc(c.touchpointLabel)}" ${dis} placeholder="e.g. Prototype review"></label>
        <label class="f">When<input name="touchpointDate" type="date" value="${c.touchpointDate ? String(c.touchpointDate).slice(0, 10) : ''}" ${dis}></label>
        ${edit ? '<div class="row" style="grid-column:1/-1"><span class="grow"></span><button class="btn soft sm">Save touchpoint</button></div>' : ''}</form></section>
      <section class="sec"><h4>Tasks<span>${ctasks.length ? `${ctasks.filter(t => t.status === 'done').length}/${ctasks.length} done · ${avg(ctasks)}% overall ` : ''}<button class="btn sm" data-newtask-ch="${c.id}">${ms('add_task')}Add task</button></span></h4>
        ${ctasks.length ? `<div class="row" style="margin-bottom:8px">${bar(avg(ctasks), ctasks.some(isLate))}<small>${ctasks.filter(isLate).length ? ctasks.filter(isLate).length + ' overdue' : 'on track'}</small></div>` : ''}${taskList(ctasks)}</section>
      <section class="sec"><h4>People on this challenge<span>${c.studentTeam ? esc(c.studentTeam) + ' · ' : ''}${cpeople.length}</span></h4>${cpeople.length ? `<div class="row">${cpeople.map(p => `<button class="chip" data-person="${p.id}" style="background:${PT[p.type].color}1F;color:${PT[p.type].color}">${ms(PT[p.type].icon)}${esc(p.name)}</button>`).join('')}</div>` : '<p class="muted">Link people from the People section (or set the student team above to match a team).</p>'}</section>
      <section class="sec"><h4>Keep the company in the loop</h4><div class="row">
        ${edit ? `<button class="btn sm" data-act="compose">${ms('mail')}Email the company</button>` : ''}
        <button class="btn ghost sm" data-act="copytrack">${ms('content_copy')}Copy tracking link</button><a class="btn ghost sm" href="${trackUrl(c)}" target="_blank" rel="noopener">${ms('open_in_new')}See what they see</a></div></section>
      ${edit ? `<section class="sec"><h4>Add a note</h4><form id="note" style="display:flex;flex-direction:column;gap:8px"><textarea name="text" rows="3" placeholder="What happened? What is next?" required></textarea>
        <div class="row"><label class="check"><input type="checkbox" name="shared"> Share with the company (shows on their tracker)</label><span class="grow"></span><button class="btn soft sm">${ms('add')}Add note</button></div></form></section>` : ''}
      <section class="sec"><h4>Timeline<span>${acts.length} entries</span></h4>${acts.length ? `<ul class="tl">${acts.map(a => `<li>${ms({ stage: 'swap_horiz', note: 'sticky_note_2', email: 'mail', assign: 'person_add', touchpoint: 'event', task: 'task_alt' }[a.kind] || 'bolt')}<div style="flex:1;min-width:0"><p><b>${esc(a.user)}</b> · <small>${new Date(a.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</small></p><p>${esc(a.detail)}</p>${a.shared === true || a.shared === 'TRUE' ? '<span class="sh">✓ Visible to company</span>' : ''}</div></li>`).join('')}</ul>` : '<p class="muted">No activity yet.</p>'}</section>
    </div>`;
  if (!drawer.open) drawer.showModal();
  drawer.scrollTop = keepScroll ? top : 0;
  if (location.hash !== '#c=' + id) history.replaceState(null, '', '#c=' + id);
  bindTaskRows(drawer);
  $$('[data-person]', drawer).forEach(b => b.onclick = () => openPerson(b.dataset.person));

  $$('[data-stage]', drawer).forEach(b => b.onclick = () => b.dataset.stage !== c.stage && moveStage(c, b.dataset.stage));
  const patchFrom = (f, keys) => Object.fromEntries(keys.map(k => [k, f[k].value]).filter(([k, v]) => String(v) !== String(k === 'touchpointDate' && c[k] ? String(c[k]).slice(0, 10) : c[k] ?? '')));
  const saveForm = (id, keys, msg) => { const f = $('#' + id, drawer); if (f && edit) f.onsubmit = async e => { e.preventDefault(); const p = patchFrom(f, keys); if (!Object.keys(p).length) return toast('Nothing changed'); await run($('button', f), () => api('updateChallenge', token, c.id, p)); toast(msg); refresh(); }; };
  saveForm('assign', ['owner', 'priority', 'facultyMentor', 'industryMentor', 'studentTeam', 'tags'], 'Saved');
  saveForm('tp', ['touchpointLabel', 'touchpointDate'], 'Touchpoint saved · visible on the tracker');
  const nf = $('#note', drawer);
  if (nf) nf.onsubmit = async e => { e.preventDefault(); if (nf.text.value.trim().length < 2) return toast('Write a note first'); await run($('button', nf), () => api('addNote', token, c.id, nf.text.value, nf.shared.checked)); toast(nf.shared.checked ? 'Note added and shared with the company' : 'Note added'); refresh(); };
}
function closeDrawer() { openId = null; if (drawer.open) drawer.close(); if (location.hash.startsWith('#c=')) history.replaceState(null, '', '#' + view); }
drawer.addEventListener('close', () => { openId = null; openPersonId = null; if (location.hash.startsWith('#c=')) history.replaceState(null, '', '#' + view); });
drawer.addEventListener('click', e => { if (e.target === drawer) closeDrawer(); });
modal.addEventListener('click', e => { if (e.target === modal) modal.close(); });

function compose(c) {
  modal.innerHTML = `<form method="dialog"><div class="mh"><div class="kick">${c.id} · ${org(c)}</div><h2>Email the company</h2><small>Start from a template, edit freely, then send. It goes from the GCL team with replies to you.</small></div>
    <div class="mb"><label class="f">Template<select name="tpl">${[['received', 'Acknowledgement'], ...STAGES.map(s => [s.key, s.label])].map(([k, l]) => `<option value="${k}" ${k === c.stage ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f">To<input name="to" value="${esc(c.email)}"></label><label class="f">Subject<input name="subject"></label>
      <label class="f">Message<textarea name="body" rows="12"></textarea></label><p class="err"></p></div>
    <div class="mf"><button class="btn ghost" value="cancel">Cancel</button><button class="btn" data-send>${ms('send')}Send email</button></div></form>`;
  const f = $('form', modal);
  const fill = async () => { const m = await run(null, () => api('previewEmail', token, c.id, f.tpl.value, '')); f.subject.value = m.subject; f.body.value = m.body; };
  f.tpl.onchange = fill; fill();
  $('[data-send]', modal).onclick = async e => {
    e.preventDefault();
    try { await run(e.currentTarget, () => api('sendEmail', token, c.id, { to: f.to.value, subject: f.subject.value, body: f.body.value })); modal.close(); toast('Email sent and logged'); refresh(); }
    catch (err) { $('.err', modal).textContent = err.message; }
  };
  modal.showModal();
}

/* ---------- global clicks ---------- */
document.addEventListener('click', async e => {
  const o = e.target.closest('[data-open]');
  if (o) return (location.hash = 'c=' + o.dataset.open);
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const c = D?.challenges.find(x => x.id === openId);
  ({
    signout: () => signOut(),
    refresh: async () => { await run(b, refresh); toast('Up to date'); },
    reset: () => { Object.assign(F, { q: '', stage: '', type: '', owner: '', priority: '' }); render(); },
    csv: exportCsv,
    close: closeDrawer,
    compose: () => compose(c),
    copytrack: async () => { await navigator.clipboard.writeText(trackUrl(c)); toast('Tracking link copied'); },
    newperson: () => newPerson(),
    importpeople: () => importPeople(),
    newtask: () => taskModal({}),
    copytasks: async () => { await navigator.clipboard.writeText(peopleUrl(personById(openPersonId))); toast('Task link copied'); },
    mailtasks: async () => { await run(b, () => api('sendTaskLink', token, openPersonId)); toast('Task link emailed'); },
    toggleperson: async () => { const p = personById(openPersonId); await run(b, () => api('savePerson', token, { ...p, active: !p.active })); toast(p.active ? 'Deactivated' : 'Reactivated'); refresh(); },
    claim: async () => { await run(b, () => api('updateChallenge', token, c.id, { owner: me.email })); toast(`${c.id} is now yours`); refresh(); },
  })[b.dataset.act]?.();
});

/* ---------- boot ---------- */
const invite = location.hash.match(/^#invite=([0-9a-f]+)$/);
if (invite) showInvite(invite[1]); else if (token) load(); else showLogin();

/* =====================================================================
   People (stakeholders) and Tasks: deadlines, assignees, progress
   ===================================================================== */
let openPersonId = null;
const T = { status: '', who: '', challenge: '', due: '', layout: 'board' };
const personById = id => D.people.find(p => p.id === id);
const teams = () => [...new Set(D.people.filter(p => p.active && p.team).map(p => p.team))].sort();
const membersOf = team => D.people.filter(p => p.active && p.team === team);
const keysOf = t => String(t.assignees || '').split(',').map(s => s.trim()).filter(Boolean);
const assignedPeople = t => D.people.filter(p => p.active && keysOf(t).some(k => k === p.id || (k.startsWith('team:') && p.team && k.slice(5) === p.team)));
const tasksOf = p => D.tasks.filter(t => assignedPeople(t).some(x => x.id === p.id));
const isLate = t => t.status !== 'done' && t.due && new Date(t.due) < Date.now() - DAY / 2;
const dueSoon = (t, n) => t.status !== 'done' && t.due && !isLate(t) && new Date(t.due) - Date.now() < n * DAY;
const canEditTask = t => !t.id || me.role === 'Admin' || t.createdBy === me.email || (t.challengeId && D.challenges.some(c => c.id === t.challengeId && canEdit(c)));
const bar = (p, late) => `<span class="pbar${late ? ' late' : ''}" title="${p}%"><i style="width:${Number(p) || 0}%"></i></span>`;
const avg = list => list.length ? Math.round(list.reduce((s, t) => s + (Number(t.progress) || 0), 0) / list.length) : 0;
const tsChip = s => `<span class="chip" style="background:${TS[s].color}1F;color:${TS[s].color}"><i></i>${TS[s].label}</span>`;
const ptChip = type => `<span class="chip" style="background:${PT[type].color}1F;color:${PT[type].color}">${ms(PT[type].icon)}${type}</span>`;
const pAvatar = p => `<span class="av" style="background:${PT[p.type]?.color || '#7A7590'}" title="${esc(p.name)} · ${esc(p.type)}">${initials(p.name)}</span>`;
const dueChip = t => !t.due ? '<small>—</small>' : t.status === 'done' ? `<small>${fmt(t.due)}</small>` : isLate(t) ? `<span class="chip red">${ms('schedule')}${fmt(t.due)}</span>` : dueSoon(t, 3) ? `<span class="chip orange">${fmt(t.due)}</span>` : `<small>${fmt(t.due)}</small>`;
const whoLabel = t => keysOf(t).map(k => k.startsWith('team:') ? `<span class="chip purple">${ms('groups')}${esc(k.slice(5))}</span>` : personById(k) ? pAvatar(personById(k)) : '').join('') || '<small>Unassigned</small>';
const peopleUrl = p => new URL('../tasks/#' + p.accessToken, location.href).href;

/* ---------- People view ---------- */
function renderPeople() {
  const q = F.q.trim().toLowerCase(), type = F.ptype || '';
  const list = D.people.filter(p => (!type || p.type === type) && (!q || [p.name, p.email, p.organisation, p.team, p.role, p.id].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => (b.active - a.active) || a.type.localeCompare(b.type) || String(a.team).localeCompare(String(b.team)) || a.name.localeCompare(b.name));
  $('#page').innerHTML = `
    <section class="card"><div class="row">
      <button class="chip ${!type ? 'purple' : ''}" data-ptype="">All · ${D.people.filter(p => p.active).length}</button>
      ${PERSON_TYPES.map(t => `<button class="chip" data-ptype="${t.key}" style="${type === t.key ? `background:${t.color};color:#fff` : `background:${t.color}1F;color:${t.color}`}">${ms(t.icon)}${t.key} · ${D.people.filter(p => p.active && p.type === t.key).length}</button>`).join('')}
      <span class="grow"></span><button class="btn ghost" data-act="importpeople">${ms('upload')}Import a list</button><button class="btn" data-act="newperson">${ms('person_add')}Add person</button></div></section>
    <section class="card scroll">${list.length ? `<table class="tbl"><thead><tr><th>Person</th><th>Type</th><th>Team / organisation</th><th>Challenges</th><th>Open tasks</th><th>Progress</th></tr></thead><tbody>
      ${list.map(p => { const ts = tasksOf(p), open = ts.filter(t => t.status !== 'done'), late = open.filter(isLate); return `<tr data-person="${p.id}" style="${p.active ? '' : 'opacity:.5'}">
        <td><div class="org">${pAvatar(p)}<div><b>${esc(p.name)}${/^DEMO-/.test(p.id) ? ' <span class="chip">Demo</span>' : ''}</b><small>${esc(p.email || 'no email')}${p.role ? ' · ' + esc(p.role) : ''}</small></div></div></td>
        <td>${ptChip(p.type)}</td><td><small>${esc(p.team || p.organisation || '—')}</small></td>
        <td><small>${esc(String(p.challengeIds || '').split(',').filter(Boolean).join(', ') || '—')}</small></td>
        <td>${open.length}${late.length ? ` <span class="chip red">${late.length} overdue</span>` : ''}</td><td>${ts.length ? bar(avg(ts), late.length) + ` <small>${avg(ts)}%</small>` : '<small>—</small>'}</td></tr>`; }).join('')}
    </tbody></table>` : '<p class="empty">No people match. Add students, faculty, company contacts and mentors here.</p>'}</section>`;
  $$('[data-ptype]').forEach(b => b.onclick = () => { F.ptype = b.dataset.ptype; renderPeople(); });
  $$('[data-person]').forEach(r => r.onclick = () => openPerson(r.dataset.person));
}

function personForm(p = {}) {
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
  return `<div class="form2">
    <label class="f">Type<select name="type">${PERSON_TYPES.map(t => opt(t.key, t.key, p.type || F.ptype || 'Student')).join('')}</select></label>
    <label class="f">Name<input name="name" value="${esc(p.name)}" required></label>
    <label class="f">Email<input name="email" type="email" value="${esc(p.email)}" placeholder="needed to email tasks"></label>
    <label class="f">Phone<input name="phone" value="${esc(p.phone)}"></label>
    <label class="f">Student team<input name="team" list="teamlist" value="${esc(p.team)}" placeholder="e.g. Team A (students)"></label>
    <label class="f">Organisation / department<input name="organisation" value="${esc(p.organisation)}"></label>
    <label class="f">Role / title<input name="role" value="${esc(p.role)}" placeholder="e.g. Team lead, CSR head"></label>
    <label class="f">Linked challenges<input name="challengeIds" list="chlist" value="${esc(p.challengeIds)}" placeholder="e.g. GCL-26-004, GCL-26-007"></label>
    <label class="f" style="grid-column:1/-1">Notes<textarea name="notes" rows="2">${esc(p.notes)}</textarea></label>
    <datalist id="teamlist">${teams().map(t => `<option value="${esc(t)}">`).join('')}</datalist>
    <datalist id="chlist">${D.challenges.map(c => `<option value="${c.id}">${esc(c.org)}</option>`).join('')}</datalist></div>`;
}
const formData = f => Object.fromEntries(new FormData(f));

function newPerson() {
  modal.innerHTML = `<form method="dialog" novalidate><div class="mh"><div class="kick">People</div><h2>Add a person</h2><small>Students, faculty, company contacts, mentors or anyone else involved.</small></div>
    <div class="mb">${personForm()}<p class="err"></p></div><div class="mf"><button class="btn ghost" value="cancel">Cancel</button><button class="btn" data-ok>${ms('person_add')}Add</button></div></form>`;
  $('[data-ok]', modal).onclick = async e => {
    e.preventDefault();
    try { const p = await run(e.currentTarget, () => api('savePerson', token, formData($('form', modal)))); modal.close(); toast(`${p.name} added`); await refresh(); openPerson(p.id); }
    catch (err) { $('.err', modal).textContent = err.message; }
  };
  modal.showModal();
}

function importPeople() {
  modal.innerHTML = `<form method="dialog" novalidate><div class="mh"><div class="kick">People</div><h2>Import a list</h2><small>One person per line: <b>Name, email, team</b> for students, or <b>Name, email, organisation</b> for everyone else. Paste straight from a spreadsheet (tabs work too). Duplicate emails are skipped.</small></div>
    <div class="mb"><label class="f">Who are they?<select name="type">${PERSON_TYPES.map(t => `<option ${t.key === (F.ptype || 'Student') ? 'selected' : ''}>${t.key}</option>`).join('')}</select></label>
      <label class="f">List<textarea name="text" rows="9" placeholder="Aarav Shah, aarav.shah@welingkar.org, Team Sustain X&#10;Diya Menon, diya.menon@welingkar.org, Team Sustain X"></textarea></label><p class="err"></p></div>
    <div class="mf"><button class="btn ghost" value="cancel">Cancel</button><button class="btn" data-ok>${ms('upload')}Import</button></div></form>`;
  $('[data-ok]', modal).onclick = async e => {
    e.preventDefault();
    const f = $('form', modal);
    try { const r = await run(e.currentTarget, () => api('importPeople', token, f.type.value, f.text.value)); modal.close(); toast(`Added ${r.added}${r.skipped.length ? `, skipped ${r.skipped.length} (duplicate or invalid)` : ''}`); refresh(); }
    catch (err) { $('.err', modal).textContent = err.message; }
  };
  modal.showModal();
}

function openPerson(id) {
  const p = personById(id);
  if (!p) return;
  openPersonId = id; openId = null;
  const ts = tasksOf(p).sort((a, b) => (a.status === 'done') - (b.status === 'done') || new Date(a.due || 8e15) - new Date(b.due || 8e15));
  const linked = String(p.challengeIds || '').split(',').map(s => s.trim()).filter(Boolean).map(cid => D.challenges.find(c => c.id === cid)).filter(Boolean)
    .concat(p.team ? D.challenges.filter(c => c.studentTeam === p.team) : []).filter((c, i, a) => a.indexOf(c) === i);
  drawer.innerHTML = `<div class="dw-h"><span class="tile lg" style="background:${PT[p.type].color}">${initials(p.name)}</span><div class="t"><div class="kick">${p.id} · ${esc(p.type)}</div><h2>${esc(p.name)}</h2>
      <div class="row" style="margin-top:6px">${p.active ? '' : '<span class="chip">Deactivated</span>'}${p.team ? `<span class="chip purple">${ms('groups')}${esc(p.team)}</span>` : ''}<small>${ts.filter(t => t.status !== 'done').length} open tasks · ${avg(ts)}% average progress</small></div></div>
      <button class="icon" data-act="close" aria-label="Close">${ms('close')}</button></div>
    <div class="dw-b">
      <section class="sec"><h4>Tasks<span><button class="btn sm" data-newtask-for="${p.id}">${ms('add_task')}Assign a task</button></span></h4>${taskList(ts)}</section>
      <section class="sec"><h4>Their private task page<span>no sign-in needed</span></h4><p class="muted" style="margin-bottom:8px">${esc(String(p.name).split(' ')[0])} can see their tasks and update status and progress here. Only share it with them.</p>
        <div class="row"><button class="btn ghost sm" data-act="copytasks">${ms('content_copy')}Copy link</button>${p.email ? `<button class="btn soft sm" data-act="mailtasks">${ms('mail')}Email them the link</button>` : '<small>Add an email to send it.</small>'}<a class="btn ghost sm" href="${peopleUrl(p)}" target="_blank" rel="noopener">${ms('open_in_new')}See what they see</a></div></section>
      ${linked.length ? `<section class="sec"><h4>Challenges</h4>${linked.map(c => `<div class="row linkrow" data-open="${c.id}" style="padding:6px 0">${orgTile(c)}<b>${org(c)}</b>${stageChip(c.stage)}<small>${c.id}</small></div>`).join('')}</section>` : ''}
      <section class="sec"><h4>Details</h4><form id="pform" novalidate>${personForm(p)}<div class="row" style="margin-top:10px">${me.role === 'Admin' ? `<button type="button" class="btn ghost sm" data-act="toggleperson">${p.active ? 'Deactivate' : 'Reactivate'}</button>` : ''}<span class="grow"></span><button class="btn soft sm">Save changes</button></div></form></section>
    </div>`;
  if (!drawer.open) drawer.showModal();
  $('#pform').onsubmit = async e => { e.preventDefault(); await run($('#pform button:last-of-type'), () => api('savePerson', token, { ...formData(e.target), id: p.id, active: p.active })); toast('Saved'); refresh(); };
  bindTaskRows(drawer);
}

/* ---------- Tasks view ---------- */
function taskFilter() {
  const q = F.q.trim().toLowerCase();
  return D.tasks.filter(t => (!q || [t.title, t.details, t.id, t.challengeId, ...assignedPeople(t).map(p => p.name)].join(' ').toLowerCase().includes(q))
    && (!T.status || t.status === T.status) && (!T.challenge || t.challengeId === T.challenge)
    && (!T.who || (T.who === 'mine' ? t.createdBy === me.email : T.who.startsWith('team:') ? keysOf(t).includes(T.who) : assignedPeople(t).some(p => p.id === T.who)))
    && (!T.due || (T.due === 'late' ? isLate(t) : T.due === 'week' ? (isLate(t) || dueSoon(t, 7)) : !t.due)));
}
function renderTasks() {
  const all = D.tasks, open = all.filter(t => t.status !== 'done');
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
  const k = (ic, bg, fg, l, v, s, f) => `<button class="kpi" data-tq='${f}'><span class="ic" style="background:${bg};color:${fg}">${ms(ic)}</span><div><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div></button>`;
  $('#page').innerHTML = `
    <section class="kpis">
      ${k('pending_actions', '#F1EEF7', '#66518A', 'Open tasks', open.length, `${all.length} in total`, '{"due":"","status":""}')}
      ${k('assignment_late', '#FBECEB', '#C0504D', 'Overdue', open.filter(isLate).length, 'past their deadline', '{"due":"late","status":""}')}
      ${k('event_upcoming', '#FFF3E6', '#9A5413', 'Due in 7 days', open.filter(t => dueSoon(t, 7)).length, 'coming up', '{"due":"week","status":""}')}
      ${k('block', '#FBECEB', '#C0504D', 'Blocked', all.filter(t => t.status === 'blocked').length, 'need help', '{"status":"blocked","due":""}')}
      ${k('task_alt', '#EAF4DD', '#3F5E1C', 'Done', all.length - open.length, `${all.filter(t => t.completedAt && Date.now() - new Date(t.completedAt) < 7 * DAY).length} this week`, '{"status":"done","due":""}')}
      ${k('speed', '#E5F4F1', '#2C7A6C', 'Average progress', avg(open) + '%', 'across open tasks', '{"due":"","status":""}')}
    </section>
    <section class="card"><div class="filters">
      <label class="f">Status<select data-t="status">${opt('', 'Any status', T.status)}${TASK_STATUSES.map(s => opt(s.key, s.label, T.status)).join('')}</select></label>
      <label class="f">Assigned to<select data-t="who">${opt('', 'Anyone', T.who)}${opt('mine', 'Created by me', T.who)}${teams().map(t => opt('team:' + t, 'Team · ' + t, T.who)).join('')}${D.people.filter(p => p.active).map(p => opt(p.id, p.name + ' (' + p.type + ')', T.who)).join('')}</select></label>
      <label class="f">Challenge<select data-t="challenge">${opt('', 'Any challenge', T.challenge)}${D.challenges.filter(c => D.tasks.some(t => t.challengeId === c.id)).map(c => opt(c.id, c.org + ' · ' + c.id, T.challenge)).join('')}</select></label>
      <label class="f">Deadline<select data-t="due">${opt('', 'Any time', T.due)}${opt('late', 'Overdue', T.due)}${opt('week', 'Overdue or next 7 days', T.due)}${opt('none', 'No deadline', T.due)}</select></label>
      <span style="flex:1"></span>
      <div class="seg"><button class="${T.layout === 'board' ? 'on' : ''}" data-layout="board">${ms('view_kanban')}Board</button><button class="${T.layout === 'list' ? 'on' : ''}" data-layout="list">${ms('list')}List</button></div>
      <button class="btn" data-act="newtask">${ms('add_task')}New task</button></div></section>
    <div id="tasksOut"></div>`;
  $$('[data-t]').forEach(s => s.onchange = () => { T[s.dataset.t] = s.value; renderTasksOut(); });
  $$('[data-layout]').forEach(b => b.onclick = () => { T.layout = b.dataset.layout; renderTasks(); });
  $$('[data-tq]').forEach(b => b.onclick = () => { Object.assign(T, JSON.parse(b.dataset.tq)); renderTasks(); });
  renderTasksOut();
}
function renderTasksOut() {
  const list = taskFilter().sort((a, b) => new Date(a.due || 8e15) - new Date(b.due || 8e15));
  const out = $('#tasksOut');
  if (T.layout === 'list') { out.innerHTML = `<section class="card scroll">${taskList(list, true)}</section>`; return bindTaskRows(out); }
  out.innerHTML = `<div class="board">${TASK_STATUSES.map(s => { const ts = list.filter(t => t.status === s.key); return `<section class="col" data-tstatus="${s.key}"><header><i style="background:${s.color}"></i>${s.label}<span>${ts.length}</span></header><div class="cards">${ts.map(t => `
    <button class="kc" data-task="${t.id}" draggable="${canEditTask(t)}"><span class="t"><span class="pri ${esc(t.priority)}"></span><b>${esc(t.title)}</b></span>
      ${t.challengeId ? `<span class="m">${esc(D.challenges.find(c => c.id === t.challengeId)?.org || '')} · ${t.challengeId}</span>` : ''}
      <span class="row">${bar(t.progress, isLate(t))}<small>${Number(t.progress) || 0}%</small></span>
      <span class="m"><span class="row" style="gap:3px">${whoLabel(t)}</span><span class="grow"></span>${dueChip(t)}</span></button>`).join('')}</div></section>`; }).join('')}</div>`;
  bindTaskRows(out);
  let drag = null;
  $$('.kc[data-task]', out).forEach(k => { k.ondragstart = () => { drag = k.dataset.task; k.classList.add('dragging'); }; k.ondragend = () => { k.classList.remove('dragging'); $$('.col', out).forEach(c => c.classList.remove('over')); }; });
  $$('.col', out).forEach(col => {
    col.ondragover = e => { if (drag) { e.preventDefault(); col.classList.add('over'); } };
    col.ondragleave = () => col.classList.remove('over');
    col.ondrop = async e => {
      e.preventDefault(); col.classList.remove('over');
      const t = D.tasks.find(x => x.id === drag); drag = null;
      if (!t || t.status === col.dataset.tstatus) return;
      await run(null, () => api('saveTask', token, { ...t, status: col.dataset.tstatus, progress: col.dataset.tstatus === 'done' ? 100 : t.progress }, {}));
      toast(`"${t.title}" → ${TS[col.dataset.tstatus].label}`); refresh();
    };
  });
}

// Shared task table (Tasks list view, person drawer, challenge drawer).
function taskList(ts, wide) {
  if (!ts.length) return '<p class="muted">No tasks yet.</p>';
  return `<div class="scroll"><table class="tbl"><thead><tr><th>Task</th>${wide ? '<th>Challenge</th>' : ''}<th>Assigned</th><th>Deadline</th><th>Status</th><th>Progress</th></tr></thead><tbody>
    ${ts.map(t => `<tr data-task="${t.id}"><td><b>${esc(t.title)}</b>${t.details ? `<br><small>${esc(String(t.details).slice(0, 70))}${t.details.length > 70 ? '…' : ''}</small>` : ''}</td>
      ${wide ? `<td><small>${t.challengeId ? esc(D.challenges.find(c => c.id === t.challengeId)?.org || '') + '<br>' + t.challengeId : '—'}</small></td>` : ''}
      <td><span class="row" style="gap:3px">${whoLabel(t)}</span></td><td>${dueChip(t)}</td><td>${tsChip(t.status)}</td><td style="min-width:110px">${bar(t.progress, isLate(t))} <small>${Number(t.progress) || 0}%</small></td></tr>`).join('')}</tbody></table></div>`;
}
function bindTaskRows(root) {
  $$('[data-task]', root).forEach(r => r.onclick = e => { e.stopPropagation(); taskModal(D.tasks.find(t => t.id === r.dataset.task)); });
  $$('[data-newtask-for]', root).forEach(b => b.onclick = () => taskModal({ assignees: b.dataset.newtaskFor }));
  $$('[data-newtask-ch]', root).forEach(b => { const c = D.challenges.find(x => x.id === b.dataset.newtaskCh); b.onclick = () => taskModal({ challengeId: c.id, assignees: c.studentTeam && teams().includes(c.studentTeam) ? 'team:' + c.studentTeam : '' }); });
}

/* ---------- Task modal: create / edit / remind / delete ---------- */
function taskModal(t = {}) {
  const isNew = !t.id, edit = canEditTask(t), dis = edit ? '' : 'disabled';
  const chosen = new Set(keysOf(t));
  const opt = (v, l, cur) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`;
  const choices = [...teams().map(tm => ({ key: 'team:' + tm, label: tm, sub: `Student team · ${membersOf(tm).length} people`, icon: 'groups', color: '#66518A' })),
    ...D.people.filter(p => p.active || chosen.has(p.id)).map(p => ({ key: p.id, label: p.name, sub: p.type + (p.team ? ' · ' + p.team : p.organisation ? ' · ' + p.organisation : ''), icon: PT[p.type].icon, color: PT[p.type].color }))];
  modal.innerHTML = `<form method="dialog" novalidate><div class="mh"><div class="kick">${isNew ? 'New task' : t.id + (t.createdBy ? ' · created by ' + esc(userName(t.createdBy)) : '')}</div><h2>${isNew ? 'Assign a task' : esc(t.title)}</h2>${edit ? '' : '<small>View only: the task creator, the challenge owner or an Admin can change it.</small>'}</div>
    <div class="mb">
      <label class="f">Task<input name="title" value="${esc(t.title)}" ${dis} placeholder="e.g. Interview 8 small-shop owners" required></label>
      <label class="f">Details<textarea name="details" rows="3" ${dis} placeholder="What does done look like?">${esc(t.details)}</textarea></label>
      <div class="form2">
        <label class="f">Challenge<select name="challengeId" ${dis}>${opt('', 'Not linked', t.challengeId || '')}${D.challenges.filter(c => OPEN(c) || c.id === t.challengeId).map(c => opt(c.id, c.org + ' · ' + c.id, t.challengeId || '')).join('')}</select></label>
        <label class="f">Deadline<input name="due" type="date" value="${t.due ? String(t.due).slice(0, 10) : ''}" ${dis}></label>
        <label class="f">Priority<select name="priority" ${dis}>${['High', 'Medium', 'Low'].map(p => opt(p, p, t.priority || 'Medium')).join('')}</select></label>
        <label class="f">Status<select name="status" ${dis}>${TASK_STATUSES.map(s => opt(s.key, s.label, t.status || 'todo')).join('')}</select></label>
      </div>
      <label class="f">Progress · <span id="pv">${Number(t.progress) || 0}%</span><input name="progress" type="range" min="0" max="100" step="5" value="${Number(t.progress) || 0}" ${dis} style="padding:0;accent-color:var(--purple)"></label>
      <div class="f">Assign to <small style="text-transform:none;letter-spacing:0;font-weight:500">a whole student team, or specific people</small>
        <input class="who-q" placeholder="Search people or teams…" ${dis}>
        <div class="who">${choices.map(c => `<label class="check" data-k="${esc((c.label + ' ' + c.sub).toLowerCase())}"><input type="checkbox" value="${esc(c.key)}" ${chosen.has(c.key) ? 'checked' : ''} ${dis}><span class="av" style="background:${c.color}">${ms(c.icon)}</span><span><b>${esc(c.label)}</b><br><small>${esc(c.sub)}</small></span></label>`).join('') || '<p class="muted">Add people first (People section).</p>'}</div></div>
      ${edit ? `<label class="check"><input type="checkbox" name="notify" ${isNew ? 'checked' : ''}> Email ${isNew ? 'the assignees' : 'anyone newly assigned'} with their private task link</label>` : ''}
      <p class="err"></p></div>
    <div class="mf">${!isNew && edit && (me.role === 'Admin' || t.createdBy === me.email) ? `<button type="button" class="btn ghost" data-del>${ms('delete')}Delete</button>` : ''}${!isNew ? `<button type="button" class="btn ghost" data-remind>${ms('notifications')}Send reminder</button>` : ''}<span class="grow" style="flex:1"></span>
      <button class="btn ghost" value="cancel">Close</button>${edit ? `<button class="btn" data-ok>${ms('check')}${isNew ? 'Create task' : 'Save'}</button>` : ''}</div></form>`;
  const f = $('form', modal);
  f.progress.oninput = () => ($('#pv').textContent = f.progress.value + '%');
  f.status.onchange = () => { if (f.status.value === 'done') { f.progress.value = 100; f.progress.oninput(); } };
  $('.who-q', modal).oninput = e => $$('.who label', modal).forEach(l => (l.hidden = !l.dataset.k.includes(e.target.value.toLowerCase())));
  $('[data-ok]', modal)?.addEventListener('click', async e => {
    e.preventDefault();
    const body = { id: t.id, title: f.title.value, details: f.details.value, challengeId: f.challengeId.value, due: f.due.value, priority: f.priority.value, status: f.status.value, progress: f.progress.value,
      assignees: $$('.who input:checked', modal).map(i => i.value) };
    try {
      const r = await run(e.currentTarget, () => api('saveTask', token, body, { notify: f.notify?.checked }));
      modal.close(); toast(`${isNew ? 'Task created' : 'Task saved'}${r.notified ? ` · emailed ${r.notified}` : ''}`); refresh();
    } catch (err) { $('.err', modal).textContent = err.message; }
  });
  $('[data-remind]', modal)?.addEventListener('click', async e => { try { const n = await run(e.currentTarget, () => api('remindTask', token, t.id)); toast(`Reminder emailed to ${n}`); } catch (err) { $('.err', modal).textContent = err.message; } });
  $('[data-del]', modal)?.addEventListener('click', async e => { if (!confirm(`Delete "${t.title}"? This cannot be undone.`)) return; await run(e.currentTarget, () => api('deleteTask', token, t.id)); modal.close(); toast('Task deleted'); refresh(); });
  modal.showModal();
}
