// Local preview of the whole site with the real Apps Script backend running in a mock.
// Run: node dev/server.js  →  http://localhost:8766/site/  ·  /site/admin/  ·  /site/track/#<token>
// Seeds demo challenges (pass --no-seed for an empty CRM). Demo sign-in is printed on start.
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
C.upsertUser_({ email: 'faculty@gcl.test', name: 'Dr. Kavita Shah', role: 'Coordinator' }, PASS);

if (!process.argv.includes('--no-seed')) seed();
state.mail.length = 0;

function seed() {
  const orgs = [['Deloitte', 'Specific business issue', 'Measure how ready mid-size clients are for India\'s data-privacy law'], ['IDFC FIRST Bank', 'Sustainability / SDG', 'Bring ESG thinking into everyday retail banking products'],
    ['Govardhan Eco Village', 'Social challenge', 'Grow and retain a reliable volunteer base for rural programmes'], ['AuraPay', 'Industry challenge', 'Win trust for a new UPI wallet among first-time digital users'],
    ['Kaleidosync', 'Process needing innovative intervention', 'Cut waste in silk farming with better forecasting'], ['Tata Power', 'Sustainability / SDG', 'Get housing societies to adopt rooftop solar faster'],
    ['Marico', 'Industry challenge', 'Grow hair-oil usage among Gen Z in tier-2 cities'], ['Mahindra Logistics', 'Process needing innovative intervention', 'Reduce empty return trips for regional trucks'],
    ['Apollo Clinics', 'Social challenge', 'Lift preventive health check-ups among working women'], ['Zomato', 'Survey / research work', 'Understand why restaurant partners churn in year one'],
    ['Godrej Properties', 'Specific business issue', 'Shorten the time from site visit to booking'], ['Asian Paints', 'Industry challenge', 'Help painters adopt a digital loyalty programme'],
    ['Pratham', 'Social challenge', 'Keep adolescent girls in school after grade 8'], ['Nykaa', 'Survey / research work', 'Map beauty-buying journeys of men aged 25-40'],
    ['HDFC Ergo', 'Specific business issue', 'Make health-claim filing painless on mobile'], ['ITC Hotels', 'Sustainability / SDG', 'Cut food waste across banqueting operations'],
    ['Swiggy Instamart', 'Industry challenge', 'Predict demand spikes for festival weeks'], ['Akshaya Patra', 'Social challenge', 'Raise repeat donations from young professionals'],
    ['Bisleri', 'Sustainability / SDG', 'Lift PET bottle collection in Mumbai suburbs'], ['Piramal Finance', 'Industry challenge', 'Credit for first-time small-shop owners'],
    ['Reliance Retail', 'Survey / research work', 'Why shoppers abandon in-store checkout queues'], ['Ola Electric', 'Specific business issue', 'Improve service experience for e-scooter owners'],
    ['Teach For India', 'Social challenge', 'Recruit more working professionals as fellows'], ['Hindustan Unilever', 'Process needing innovative intervention', 'Speed up small-retailer onboarding to eB2B'],
    ['UrbanClap', 'Industry challenge', 'Retain top-rated service partners'], ['Bajaj Auto', 'Survey / research work', 'Rural youth perception of electric two-wheelers'],
    ['Mumbai Metro One', 'Social challenge', 'Last-mile connectivity from metro stations'], ['Wipro', 'Specific business issue', 'Design a mentoring programme for hybrid teams'],
    ['Amul', 'Industry challenge', 'Launch a protein range for gym-goers'], ['Lodha', 'Sustainability / SDG', 'Make residents compost at home'],
    ['Paytm', 'Specific business issue', 'Merchant soundbox adoption in tier-3 towns'], ['Practo', 'Survey / research work', 'How seniors book doctor appointments'],
    ['Decathlon', 'Industry challenge', 'Grow women\'s participation in team sports'], ['Smile Foundation', 'Social challenge', 'Volunteer engagement after the first event'],
    ['Titan Eyeplus', 'Specific business issue', 'Shorten in-store eye-test waiting time'], ['Blue Dart', 'Process needing innovative intervention', 'Fewer failed first-attempt deliveries'],
    ['Cipla', 'Social challenge', 'Asthma awareness among school teachers'], ['Haldiram\'s', 'Industry challenge', 'Healthier snacking range for office cafeterias']];
  const first = ['Priya', 'Arjun', 'Neha', 'Vikram', 'Sana', 'Rohan', 'Meera', 'Kabir', 'Isha', 'Dev', 'Anaya', 'Karan'];
  const last = ['Sharma', 'Kulkarni', 'Nair', 'Patel', 'Khan', 'Desai', 'Rao', 'Mehta', 'Iyer', 'Gupta'];
  const flow = ['new', 'review', 'accepted', 'team', 'stakeholders', 'journey', 'insights', 'prototype', 'final', 'completed'];
  const owners = ['admin@gcl.test', 'coord@gcl.test', 'faculty@gcl.test', ''];
  let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const day = 864e5, now = Date.now();
  orgs.forEach(([org, type, ch], i) => {
    const age = Math.floor(Math.pow(r(), 1.3) * 120) + 1, created = new Date(now - age * day);
    const fn = first[i % first.length], ln = last[(i * 7) % last.length];
    const c = C.createChallenge_({ organisation: org, name: fn + ' ' + ln, designation: ['Head of Strategy', 'VP Marketing', 'CSR Lead', 'Product Manager', 'Director, Operations'][i % 5],
      email: (fn + '.' + ln + '@' + org.toLowerCase().replace(/[^a-z]/g, '') + '.example').toLowerCase(), phone: '98' + String(10000000 + i * 7919).slice(0, 8), type,
      challenge: ch + '. We would like a fresh, research-led view and a prototype we can pilot.', mentor: r() < 0.55 ? 'Yes' : '' }, created, false);
    const row = C.readAll_('Challenges').at(-1);
    const reach = Math.min(flow.length - 1, Math.floor(age / 12 * (0.6 + r() * 0.8)));
    const stage = r() < 0.06 ? 'declined' : r() < 0.05 ? 'hold' : flow[reach];
    const owner = stage === 'new' ? '' : owners[i % 3];
    const steps = stage === 'declined' || stage === 'hold' ? ['review', stage] : flow.slice(1, reach + 1);
    const actor = { admin: 'Asha Menon', coord: 'Rahul Iyer', faculty: 'Dr. Kavita Shah' }[(owner || 'admin@').split('@')[0]] || 'Asha Menon';
    steps.forEach((st, k) => C.append_('Activity', { at: new Date(created.getTime() + (k + 1) * (age * day) / (steps.length + 1)), challengeId: row.id, user: actor, kind: 'stage',
      detail: 'Moved from ' + C.STAGE_LABEL[k ? steps[k - 1] : 'new'] + ' to ' + C.STAGE_LABEL[st], shared: st !== 'hold' }));
    if (steps.length > 2) C.append_('Activity', { at: new Date(now - r() * 5 * day), challengeId: row.id, user: actor, kind: 'note', detail: ['Client keen on a pilot in Q1.', 'Data sharing NDA signed.', 'Team visited the site, great access to users.', 'Mentor asked for a mid-way check-in.'][i % 4], shared: i % 2 === 0 });
    Object.assign(row, {
      stage, stageAt: new Date(now - Math.min(age, 4 + r() * 16) * day), owner, priority: ['High', 'Medium', 'Medium', 'Low'][i % 4],
      facultyMentor: reach >= 3 ? ['Dr. Kavita Shah', 'Prof. Anil Joshi', 'Dr. Ritu Bhat'][i % 3] : '', industryMentor: reach >= 3 && row.mentor ? row.name : '',
      studentTeam: reach >= 3 ? 'Team ' + String.fromCharCode(65 + (i % 26)) + (i > 25 ? '2' : '') : '',
      touchpointDate: ['team', 'insights', 'prototype', 'final', 'review'].includes(stage) ? new Date(now + (r() * 24 - 4) * day) : '',
      touchpointLabel: { team: 'Kick-off with team', insights: 'Phase I: opportunity spaces', prototype: 'Prototype review', final: 'Final presentation', review: 'Scoping call' }[stage] || '',
      updated: new Date(now - r() * 10 * day)
    });
    C.write_('Challenges', row);
  });
  console.log('Seeded', orgs.length, 'demo challenges');
}

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
