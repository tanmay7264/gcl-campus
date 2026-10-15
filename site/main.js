import { PROJECTS } from './projects.js';
import { STAGES, ROLE, PEOPLE } from './data.js';

// Google Apps Script Web App URL (see ../apps-script/Code.gs). Empty = form shows "not connected".
const SCRIPT_URL = '';

const $ = (s, el = document) => el.querySelector(s);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const P = Object.fromEntries(PROJECTS.map(p => [p.id, p]));
const S = Object.fromEntries(STAGES.map((s, i) => [s.id, { ...s, i }]));
const PCOLOR = { deloitte: '#4F86C6', idfc: '#7B63A6', govardhan: '#B98A55', aurapay: '#7B63A6', kaleidosync: '#B98A55' };
const ms = name => `<span class="ms">${name}</span>`;

let map = null;          // 3D scene API (null without WebGL)
let current = null;      // selected id: stage, project (= its student team), people group, or "rep:<project>" (company mentor)
let tab = 'projects';
let story = null;        // { stage, project } of the live project walking the campus

/* ---------- Selection ---------- */
function select(id, { fly = true } = {}) {
  if (id && !S[id] && !P[id] && !PEOPLE[id] && !(id.startsWith('rep:') && P[id.slice(4)])) id = null;
  current = id;
  map?.select(id, { fly });
  renderInspector(); renderTracker(); renderRows();
  history.replaceState(null, '', id ? '#' + id.replace('rep:', '') : location.pathname);
}

/* ---------- Inspector ---------- */
const insp = $('#inspector');
const head = (tile, color, kicker, title, sub) => `
  <div class="ihead">
    <span class="tile lg" style="background:${color}">${tile}</span>
    <div><small class="kicker">${kicker}</small><h2>${title}</h2><small>${sub}</small></div>
    <button class="icon" data-action="close" aria-label="Close panel">${ms('close')}</button>
  </div>`;
const rows = list => `<dl class="rows">${list.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
const projCard = p => `<button class="pcard" data-select="${p.id}"><span class="tile" style="background:${PCOLOR[p.id]}">${p.org[0]}</span><span><b>${p.org}</b><small>${p.title}</small></span>${ms('chevron_right')}</button>`;

function renderInspector() {
  insp.classList.remove('enter'); void insp.offsetWidth; insp.classList.add('enter');
  if (!current) {
    insp.innerHTML = `
      ${head(ms('school'), '#66518A', 'WELCOME · GCL 2026-27', 'Welcome to the GCL Campus', 'Where companies bring problems and students solve them')}
      <p class="lead">Share a <b>real challenge</b> from your organisation. Over <b>two trimesters</b>, our Post Graduate management teams turn it into a <b>researched, prototyped, commercially feasible solution</b>, mentored by WeSchool faculty and by you.</p>
      <p class="muted">Modelled on "Leadership Beyond Boundaries" by the Center for Creative Leadership (CCL) and Design Impact (DI).</p>
      <ul class="howto">
        <li><i class="dot" style="background:#E8892B"></i><span><b>Company mentors</b> walk in with an orange problem card and leave with a green solution</span></li>
        <li><i class="dot" style="background:#3FA796"></i><span><b>Student teams</b> work on live projects at the tables under the idea bulbs</span></li>
        <li><i class="dot" style="background:#66518A"></i><span><b>Faculty mentors</b> guide every team, start to finish</span></li>
        <li>${ms('ads_click')}<span>Click any building, team or person · drag to pan · scroll to zoom</span></li>
      </ul>
      <div class="actions"><button class="btn primary" data-select="challenge">${ms('play_arrow')}Start the tour</button><button class="btn soft" data-action="form">Submit a Challenge</button></div>`;
    return;
  }
  const g = PEOPLE[current];
  if (g) {
    insp.innerHTML = `
      ${head(ms(g.icon), g.color, g.kicker, g.title, 'On the GCL Campus')}
      <p class="lead">${g.lead}</p>
      ${rows(g.rows)}
      <div class="egt"><b>Live projects so far</b></div>
      ${PROJECTS.slice(0, 3).map(projCard).join('')}
      <div class="actions">${g.cta === 'form' ? `<button class="btn primary" data-action="form">Submit a Challenge</button>` : `<button class="btn primary" data-select="${g.cta}">See them at work ${ms('arrow_forward')}</button>`}<button class="btn soft" data-select="challenge">How it works</button></div>`;
    insp.querySelector('.rows').classList.add('stack');
    return;
  }
  const rep = current.startsWith('rep:');
  const p = P[rep ? current.slice(4) : current];
  if (p) {
    insp.innerHTML = `
      ${head(p.org[0], PCOLOR[p.id], 'PARTNER PROJECT · ' + p.domain.toUpperCase(), p.title, p.org)}
      <div class="status">${rep ? '<span class="chip orange">Sharing the challenge</span><span class="muted">Company mentor visiting the team</span>' : '<span class="chip green">Live project · completed</span><span class="muted">Student team at work</span>'}</div>
      <button class="thumb" data-poster="${p.id}"><img src="${p.image}" alt="${p.org} project poster"><span>${ms('open_in_full')} View poster</span></button>
      ${rows([['Challenge', p.challenge], ['Stakeholders', p.stakeholders], ['Insight', p.insight], ['Prototype', p.prototype], ['Solution', p.outcome]])}
      <p class="team">${ms('groups')}<span>${p.team}${p.mentor ? '<br>' + p.mentor : ''}</span></p>
      <div class="actions"><button class="btn primary" data-poster="${p.id}">${ms('image')}View poster</button><button class="btn soft" data-action="form">Bring us a challenge like this</button></div>`;
    insp.querySelector('.rows').classList.add('stack');
    return;
  }
  const s = S[current], last = s.i === STAGES.length - 1, eg = P[s.eg];
  const evidence = s.bars
    ? `<div class="egt"><b>Seen in a past project</b><small>% of respondents</small></div>` + s.bars.map(([l, v, c]) => `<div class="bar"><span>${l}</span><b>${v}%</b><i style="--w:${v}%;--c:${c}"></i></div>`).join('')
    : `<div class="egt"><b>Seen in past projects</b></div><ul class="evidence">${s.evidence.map(([k, v]) => `<li><b>${k}</b>${v}</li>`).join('')}</ul>`;
  insp.innerHTML = `
    ${head(s.num, s.i === 0 ? '#F0973A' : '#7AA342', (s.i ? 'STAGE ' + s.i : 'START') + ' · ' + s.term.toUpperCase(), s.title, s.building)}
    <div class="status">${s.role ? '<span class="chip orange">★ Your touchpoint</span>' : '<span class="chip">Student-led</span>'}<span class="muted">Step ${s.i + 1} of ${STAGES.length}</span></div>
    <div class="progress"><i style="--w:${(s.i / (STAGES.length - 1)) * 100}%"></i></div>
    ${rows(s.rows)}
    ${s.role ? `<div class="role">${ms('star')}<div><small>YOUR ROLE</small><b>${s.role}</b></div></div>` : ''}
    ${evidence}
    ${projCard(eg)}
    <div class="actions">
      <button class="btn primary" data-select="${eg.id}">View ${eg.org.split(' ')[0]} project</button>
      ${last ? `<button class="btn soft" data-action="form">Submit a Challenge</button>` : `<button class="btn soft" data-select="${STAGES[s.i + 1].id}">Next stage ${ms('arrow_forward')}</button>`}
    </div>`;
}

/* ---------- Tracker ---------- */
const WHO = { companies: ['Company', '#E8892B'], faculty: ['Faculty', '#66518A'], students: ['Students', '#3FA796'] };
function renderTracker() {
  const live = !current && story; // nothing selected: the tracker narrates the featured company's live project
  const si = live ? S[story.stage].i : S[current]?.i ?? (P[current?.replace('rep:', '')] ? STAGES.length : -1); // a project = journey complete
  const walking = live && story.phase === 'walk';
  $('#steps').innerHTML = STAGES.map((s, i) => {
    const st = i < si ? 'done' : i === si ? 'active' : 'todo';
    const cls = st + (walking && i === si ? ' walking' : '') + (walking && i === si - 1 ? ' leaving' : '');
    const dot = st === 'done' ? ms('check') : walking && i === si ? ms('directions_walk') : s.num;
    const sub = st === 'active' ? (live ? (walking ? 'On the way' : 'Happening now') : 'You are here') : s.term.split(' · ')[0].replace('Trimester', 'Trim');
    return `<li class="${cls}"><button data-select="${s.id}" aria-current="${st === 'active' ? 'step' : 'false'}"><span class="dot">${dot}</span><b>${s.short}</b><small>${sub}</small></button></li>`;
  }).join('');
  const p = live ? P[story.project] : P[current?.replace('rep:', '')] || P[S[current]?.eg] || P.idfc;
  if (live) {
    const s = S[story.stage];
    $('#trackSub').innerHTML = `<span class="featured"><span class="tile" style="background:${PCOLOR[p.id]}">${p.org[0]}</span>${p.org}</span><span class="muted">${p.title} · now featured</span>`;
    $('#current').innerHTML = `
      <div class="now ${walking ? 'walk' : 'work'}">
        <div class="now-head"><span class="live-dot"></span><b>${walking ? 'On the way to ' + s.building : 'Happening now · ' + s.building}</b><span class="step">Step ${s.i + 1} of ${STAGES.length}</span></div>
        <p>${s.plain}</p>
        <div class="now-foot">
          <span class="who">${s.who.map(w => `<span><i style="background:${WHO[w][1]}"></i>${WHO[w][0]}</span>`).join('')}</span>
          <span class="you ${s.you ? '' : 'none'}">${s.you ? '★ Company: ' + s.you : 'Students lead this step'}</span>
        </div>
        <div class="timebar"><i style="animation-duration:${walking ? 1.2 : story.duration}s"></i></div>
      </div>`;
    return;
  }
  $('#trackSub').textContent = `#GCL-${p.id.toUpperCase()} · ${p.title}`;
  $('#current').innerHTML = `<button class="ccard" data-select="${p.id}"><span class="tile lg" style="background:${PCOLOR[p.id]}">${p.org.slice(0, 3).toUpperCase()}</span>
    <span><b>#GCL-${p.id.toUpperCase()}</b><small>${p.org}</small><span class="chip green">${current && S[current] ? 'Example for this stage' : 'Completed project'}</span></span>${ms('chevron_right')}</button>`;
}

/* ---------- List tabs + search ---------- */
const rowStage = s => `<li><button data-select="${s.id}" class="${current === s.id ? 'on' : ''}"><span class="tile" style="background:${s.id === 'challenge' ? '#F0973A' : '#7AA342'}">${s.num}</span><span><b>${s.title}</b><small>${s.building} · ${s.term}</small></span><span class="chip">${s.role ? '★ You' : 'Students'}</span></button></li>`;
const rowProject = p => { const f = story?.project === p.id; return `<li><button data-select="${p.id}" class="${current === p.id ? 'on' : ''} ${f ? 'featured' : ''}"><span class="tile" style="background:${PCOLOR[p.id]}">${p.org[0]}</span><span><b>${p.org}</b><small>${f ? 'Live now · ' + S[story.stage].short : p.title}</small></span><span class="chip ${f ? 'orange' : ''}">${f ? '● Live' : p.domain.split(' · ')[0]}</span></button></li>`; };
const rowRole = s => `<li><button data-select="${s.id}" class="${current === s.id ? 'on' : ''}"><span class="tile" style="background:#F0973A">${ms('star')}</span><span><b>${s.role}</b><small>${s.title} · ${s.term}</small></span></button></li>`;
function renderRows() {
  const q = $('#search').value.trim().toLowerCase();
  document.querySelectorAll('[data-tab]').forEach(b => b.setAttribute('aria-selected', !q && b.dataset.tab === tab));
  let html;
  if (q) {
    const hit = o => JSON.stringify(o).toLowerCase().includes(q);
    html = STAGES.filter(hit).map(rowStage).join('') + PROJECTS.filter(hit).map(rowProject).join('') || `<li class="empty">No matches for “${q}”</li>`;
  } else html = (tab === 'stages' ? STAGES.map(rowStage) : tab === 'role' ? ROLE.map(rowRole) : PROJECTS.map(rowProject)).join('');
  $('#rows').innerHTML = html;
}
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; $('#search').value = ''; renderRows(); }));
$('#search').addEventListener('input', renderRows);
$('#search').addEventListener('keydown', e => { if (e.key === 'Enter') $('#rows button')?.click(); });

/* ---------- Global clicks & keys ---------- */
const formDrawer = $('#formDrawer'), posterModal = $('#posterModal');
document.addEventListener('click', e => {
  const t = e.target.closest('[data-select],[data-action],[data-poster],[data-close]');
  if (!t) return;
  if (t.dataset.select) return select(t.dataset.select);
  if (t.dataset.poster) { const p = P[t.dataset.poster]; $('img', posterModal).src = p.image; $('img', posterModal).alt = p.org + ' project poster'; return posterModal.showModal(); }
  if (t.hasAttribute('data-close')) return t.closest('dialog').close();
  ({
    form: () => formDrawer.showModal(),
    close: () => select(null),
    zoomin: () => map?.zoom(1.35), zoomout: () => map?.zoom(1 / 1.35),
    spin: () => map?.spin(90), home: () => { map?.home(); },
  })[t.dataset.action]?.();
});
for (const d of [formDrawer, posterModal]) d.addEventListener('click', e => { if (e.target === d) d.close(); });
addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') { e.preventDefault(); $('#search').focus(); }
  if (e.key === 'Escape' && !document.querySelector('dialog[open]') && current) select(null);
});

/* ---------- Partner form ---------- */
const form = $('#form'), status = $('.status', form);
form.addEventListener('submit', async e => {
  e.preventDefault();
  form.classList.add('touched'); status.className = 'status';
  if (!form.checkValidity()) { form.reportValidity(); return; }
  if (form.website.value) return; // honeypot filled = bot
  if (!SCRIPT_URL) { status.className = 'status err'; status.textContent = 'Submissions are not connected yet. Please email the GCL team in the meantime.'; return; }
  const btn = $('button[type=submit]', form);
  btn.disabled = true; status.textContent = 'Sending…';
  try {
    // no-cors: Apps Script sends no CORS headers; the response is opaque but the row is written.
    await fetch(SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(new FormData(form)) });
    status.className = 'status ok'; status.textContent = 'Thank you! Your challenge has been submitted. The GCL team will be in touch.';
    form.reset(); form.classList.remove('touched');
  } catch {
    status.className = 'status err'; status.textContent = 'Could not send. Please check your connection and try again.';
  } finally { btn.disabled = false; }
});

/* ---------- Boot ---------- */
addEventListener('hashchange', () => select(location.hash.slice(1) || null));
const initial = location.hash.slice(1) || null;
select(initial, { fly: false });

import('./scene.js').then(({ createScene }) => {
  map = createScene($('#scene'), $('#labels'), {
    onSelect: id => select(id), reduceMotion,
    onStory: ev => {
      const changed = ev.project !== story?.project;
      story = ev;
      const s = S[ev.stage], p = P[ev.project];
      map.storyEl.innerHTML = `<span class="live-dot"></span><span><b>${p.org}</b><small>${ev.phase === 'walk' ? 'Walking to ' + s.building : s.short + ' · ' + s.building}</small></span>`;
      document.querySelectorAll('.maplabel[data-id]').forEach(l => l.classList.toggle('featured', l.dataset.id === ev.project));
      if (!current) renderTracker();
      if (changed || tab === 'projects') renderRows();
    },
  });
  STAGES.forEach(s => map.addLabel(s.id, `<i class="${s.id === 'challenge' ? 'orange' : ''}">${s.num}</i>${s.building}`, 'stage'));
  PROJECTS.forEach(p => map.addLabel(p.id, `${ms('groups')}${p.org}`, 'project'));
  map.addLabel('about', `${ms('account_balance')}WeSchool Main Block`, 'project');
  if (current) map.select(current);
}).catch(err => {
  console.warn('3D campus disabled:', err);
  document.body.classList.add('no-webgl'); $('.nogl').hidden = false;
});
