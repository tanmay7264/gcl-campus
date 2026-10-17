// Company-facing tracker: the private link from our emails (track/#<token>). Shows only what the server shares.
import { api, esc } from '../api.js?v=20';
import { ST, PATH } from '../crm-stages.js?v=20';

const ms = n => `<span class="ms" aria-hidden="true">${n}</span>`;
const fmt = d => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const el = document.getElementById('tk');

async function show() {
  const token = location.hash.slice(1);
  if (!/^[0-9a-f]{24,}$/.test(token)) return notFound();
  let t;
  try { t = await api('getTracking', token); } catch (e) { return e.message === 'NOT_FOUND' ? notFound() : (el.innerHTML = `<div class="card empty">${esc(e.message)}</div>`); }
  const s = ST[t.stage], pi = PATH.findIndex(x => x.key === t.stage), closedOff = pi < 0;
  // When did each stage start? Taken from the shared "Moved … to <Label>" entries.
  const reached = {};
  for (const u of t.updates.slice().reverse()) { const m = /to (.+)$/.exec(u.kind === 'stage' ? u.text : ''); const k = m && PATH.find(x => x.label === m[1]); if (k) reached[k.key] = u.at; }
  reached.new = t.created;
  document.title = `${t.organisation} · GCL challenge ${t.id}`;
  el.innerHTML = `
    <section class="card hero"><div class="kick">${esc(t.id)} · ${esc(t.type)}</div><h1>${esc(String(t.organisation).replace(/^'/, ''))}</h1>
      <p class="muted">${esc(t.challenge)}${t.challenge.length >= 400 ? '…' : ''}</p>
      <div class="row" style="margin-top:12px"><span class="chip" style="background:${s.color}1F;color:${s.color}"><i></i>${s.label}</span><small>since ${fmt(t.stageAt)} · submitted ${fmt(t.created)}</small></div>
      <div class="now"><div><small>What happens next</small>${esc(s.next)}</div><div class="you"><small>Your role</small>${esc(s.you)}</div></div></section>
    <div class="two">
      <section class="card"><header>${ms('route')}<h3>Journey</h3><small>${closedOff ? s.label : `step ${pi + 1} of ${PATH.length}`}</small></header>
        <ol class="vsteps">${PATH.map((x, i) => `<li class="${!closedOff && i < pi ? 'done' : !closedOff && i === pi ? 'cur' : ''}"><span class="dot">${!closedOff && i < pi ? ms('check') : ''}</span><div><b>${x.label}</b>${reached[x.key] && (closedOff || i <= pi) ? `<small>${fmt(reached[x.key])}</small>` : ''}</div></li>`).join('')}</ol></section>
      <div class="side2">
        <section class="card"><header>${ms('event')}<h3>Next touchpoint</h3></header>${t.touchpoint ? `<div class="row"><span class="date"><small>${new Date(t.touchpoint.date).toLocaleDateString('en-IN', { month: 'short' })}</small><b>${new Date(t.touchpoint.date).getDate()}</b></span><div><b>${esc(t.touchpoint.label || 'Meeting with the team')}</b><br><small>${new Date(t.touchpoint.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</small></div></div>` : '<p class="muted">Nothing scheduled yet. We will email you when there is.</p>'}</section>
        ${t.team || t.industryMentor ? `<section class="card"><header>${ms('groups')}<h3>Your GCL team</h3></header><dl class="kv">${t.team ? `<dt>Student team</dt><dd>${esc(t.team)}</dd>` : ''}${t.industryMentor ? `<dt>Industry mentor</dt><dd>${esc(t.industryMentor)}</dd>` : ''}</dl></section>` : ''}
        <section class="card"><header>${ms('forum')}<h3>Updates from the GCL team</h3></header>${t.updates.length ? `<ul class="tl">${t.updates.map(u => `<li>${ms({ stage: 'swap_horiz', note: 'chat', email: 'mail', touchpoint: 'event' }[u.kind] || 'bolt')}<div><p>${esc(u.text)}</p><small>${fmt(u.at)}</small></div></li>`).join('')}</ul>` : '<p class="muted">No updates yet.</p>'}</section>
      </div>
    </div>
    <p class="muted" style="text-align:center">Questions? Reply to any email from the GCL team. · <a href="../#why">Why partner with GCL</a> · <a href="../">Watch GCL projects live</a></p>`;
}

function notFound() {
  el.innerHTML = `<section class="card empty"><h2>We could not find that challenge</h2><p style="margin:8px 0 16px">Please use the full link from your GCL email. If it still does not work, reply to that email and we will help.</p><a class="btn" href="../">Visit the GCL Campus</a></section>`;
}

addEventListener('hashchange', show);
show();
