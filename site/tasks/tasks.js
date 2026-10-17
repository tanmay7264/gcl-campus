// "My GCL tasks": the private link a student, faculty member or company contact gets by email (tasks/#<token>).
// They see only their own tasks (assigned directly or to their team) and can update status, progress and add a note.
import { api, esc } from '../api.js?v=21';
import { TASK_STATUSES, TS } from '../crm-stages.js?v=21';

const ms = n => `<span class="ms" aria-hidden="true">${n}</span>`;
const fmt = d => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const el = document.getElementById('tk');
const tok = () => location.hash.slice(1);
let data = null;

const dueChip = t => {
  if (!t.due) return '<span class="chip">No deadline</span>';
  const d = Math.ceil((new Date(t.due) - Date.now()) / 864e5);
  if (t.status === 'done') return `<span class="chip green">Done · was due ${fmt(t.due)}</span>`;
  return d < 0 ? `<span class="chip red">Overdue by ${-d} day${d === -1 ? '' : 's'}</span>` : d <= 3 ? `<span class="chip orange">Due ${d === 0 ? 'today' : d === 1 ? 'tomorrow' : 'in ' + d + ' days'}</span>` : `<span class="chip">Due ${fmt(t.due)}</span>`;
};

function render() {
  const T = data.tasks.slice().sort((a, b) => (a.status === 'done') - (b.status === 'done') || new Date(a.due || 8e15) - new Date(b.due || 8e15));
  const open = T.filter(t => t.status !== 'done'), late = open.filter(t => t.due && new Date(t.due) < Date.now());
  const avg = T.length ? Math.round(T.reduce((s, t) => s + t.progress, 0) / T.length) : 0;
  const p = data.person;
  el.innerHTML = `
    <section class="card hero"><div class="kick">${esc(p.type)}${p.team ? ' · ' + esc(p.team) : p.organisation ? ' · ' + esc(p.organisation) : ''}</div><h1>Hi ${esc(String(p.name).split(' ')[0])}, here are your GCL tasks</h1>
      <p class="muted">Update the status and progress as you go. The GCL team sees your updates straight away. This link is just for you.</p></section>
    <div class="stats"><div><small>Open</small><b>${open.length}</b></div><div><small>Overdue</small><b style="color:${late.length ? 'var(--red)' : 'inherit'}">${late.length}</b></div><div><small>Done</small><b>${T.length - open.length}</b></div><div><small>Overall progress</small><b>${avg}%</b></div></div>
    ${T.length ? T.map(t => `<section class="card task" data-id="${t.id}">
      <div class="hd"><b>${esc(t.title)}</b><span class="chip" style="background:${TS[t.status].color}1F;color:${TS[t.status].color}"><i></i>${TS[t.status].label}</span></div>
      <div class="row">${dueChip(t)}${t.challenge ? `<small>${esc(t.challenge.organisation)} · ${esc(t.challenge.id)}</small>` : ''}${t.viaTeam ? '<small>· assigned to your team</small>' : ''}</div>
      ${t.details ? `<p class="quote">${esc(t.details)}</p>` : ''}
      <div class="row"><div class="bar grow"><i style="width:${t.progress}%"></i></div><b class="pv">${t.progress}%</b></div>
      <form class="upd" novalidate>
        <label class="f">Status<select name="status">${TASK_STATUSES.map(s => `<option value="${s.key}" ${s.key === t.status ? 'selected' : ''}>${s.label}</option>`).join('')}</select></label>
        <label class="f">Progress<input name="progress" type="range" min="0" max="100" step="5" value="${t.progress}" aria-label="Progress percent"></label>
        <label class="f" style="grid-column:1/-1">Note for the GCL team (optional)<input name="comment" placeholder="e.g. Interviews done, writing up findings"></label>
        <div class="row" style="grid-column:1/-1"><p class="err grow"></p><button class="btn sm">${ms('check')}Save update</button></div>
      </form></section>`).join('') : '<section class="card empty">No tasks assigned to you yet. We will email you when there are.</section>'}
    <p class="muted" style="text-align:center">Questions? Reply to the email that brought you here. · <a href="../">GCL Campus</a></p>`;
  for (const card of el.querySelectorAll('.task')) {
    const f = card.querySelector('form'), id = card.dataset.id;
    f.progress.oninput = () => { card.querySelector('.pv').textContent = f.progress.value + '%'; card.querySelector('.bar i').style.width = f.progress.value + '%'; };
    f.status.onchange = () => { if (f.status.value === 'done') { f.progress.value = 100; f.progress.oninput(); } };
    f.onsubmit = async e => {
      e.preventDefault();
      const b = f.querySelector('button'); b.disabled = true;
      try {
        const t = await api('updateMyTask', tok(), id, { status: f.status.value, progress: f.progress.value, comment: f.comment.value });
        data.tasks = data.tasks.map(x => x.id === id ? t : x); render();
        el.querySelector(`[data-id="${id}"] .err`).innerHTML = '<span style="color:var(--green-d)">Saved. Thank you!</span>';
      } catch (err) { f.querySelector('.err').textContent = err.message; b.disabled = false; }
    };
  }
}

async function show() {
  if (!/^[0-9a-f]{24,}$/.test(tok())) return notFound();
  try { data = await api('getMyTasks', tok()); render(); }
  catch (e) { e.message === 'NOT_FOUND' ? notFound() : (el.innerHTML = `<div class="card empty">${esc(e.message)}</div>`); }
}
function notFound() { el.innerHTML = '<section class="card empty"><h2>We could not open your tasks</h2><p style="margin:8px 0 0">Please use the full link from your GCL email, or reply to it and we will send a fresh one.</p></section>'; }
addEventListener('hashchange', show);
show();
