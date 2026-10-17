// Demo data for showing the Command Centre: about 38 realistic challenges, history and three demo teammates.
// Everything demo is marked: IDs start with DEMO-, tags contain "demo", emails end in .example (so no email can ever
// reach a real person), and demo teammates have no password (they cannot sign in). removeDemoData_ deletes all of it.

var DEMO_DOMAIN = '@gcl-demo.example';

function isDemoChallenge_(c) { return /^DEMO-/.test(c.id) || /(^|,\s*)demo(,|$)/.test(String(c.tags)); }

function appendMany_(name, objs) {
  if (!objs.length) return;
  var sh = table_(name);
  sh.getRange(sh.getLastRow() + 1, 1, objs.length, TABLES[name].length).setValues(objs.map(function (o) { return toRow_(name, o); }));
}

// owner: email of a real Admin to give some demo challenges to, so "Needs attention" looks alive for them.
function seedDemo_(owner) {
  return withLock_(function () {
    if (readAll_('Challenges').some(isDemoChallenge_)) throw new Error('Demo data is already loaded. Remove it first to reload.');
    var orgs = [['Deloitte', 'Specific business issue', 'Measure how ready mid-size clients are for India\'s data-privacy law'], ['IDFC FIRST Bank', 'Sustainability / SDG', 'Bring ESG thinking into everyday retail banking products'],
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
      ['Urban Company', 'Industry challenge', 'Retain top-rated service partners'], ['Bajaj Auto', 'Survey / research work', 'Rural youth perception of electric two-wheelers'],
      ['Mumbai Metro One', 'Social challenge', 'Last-mile connectivity from metro stations'], ['Wipro', 'Specific business issue', 'Design a mentoring programme for hybrid teams'],
      ['Amul', 'Industry challenge', 'Launch a protein range for gym-goers'], ['Lodha', 'Sustainability / SDG', 'Make residents compost at home'],
      ['Paytm', 'Specific business issue', 'Merchant soundbox adoption in tier-3 towns'], ['Practo', 'Survey / research work', 'How seniors book doctor appointments'],
      ['Decathlon', 'Industry challenge', 'Grow women\'s participation in team sports'], ['Smile Foundation', 'Social challenge', 'Volunteer engagement after the first event'],
      ['Titan Eyeplus', 'Specific business issue', 'Shorten in-store eye-test waiting time'], ['Blue Dart', 'Process needing innovative intervention', 'Fewer failed first-attempt deliveries'],
      ['Cipla', 'Social challenge', 'Asthma awareness among school teachers'], ['Haldiram\'s', 'Industry challenge', 'Healthier snacking range for office cafeterias']];
    var first = ['Priya', 'Arjun', 'Neha', 'Vikram', 'Sana', 'Rohan', 'Meera', 'Kabir', 'Isha', 'Dev', 'Anaya', 'Karan'];
    var last = ['Sharma', 'Kulkarni', 'Nair', 'Patel', 'Khan', 'Desai', 'Rao', 'Mehta', 'Iyer', 'Gupta'];
    var flow = ['new', 'review', 'accepted', 'team', 'stakeholders', 'journey', 'insights', 'prototype', 'final', 'completed'];
    var team = [['rahul' + DEMO_DOMAIN, 'Rahul Iyer (demo)'], ['kavita' + DEMO_DOMAIN, 'Dr. Kavita Shah (demo)'], ['anil' + DEMO_DOMAIN, 'Prof. Anil Joshi (demo)']];
    var existing = readAll_('Users').map(function (u) { return u.email; });
    appendMany_('Users', team.filter(function (t) { return existing.indexOf(t[0]) < 0; })
      .map(function (t) { return { email: t[0], name: t[1], role: 'Coordinator', active: true, created: new Date() }; }));
    var owners = [owner || team[0][0], team[0][0], team[1][0], team[2][0]];
    var names = {}; team.forEach(function (t) { names[t[0]] = t[1]; });
    var ownerName = function (e) { return names[e] || (findUser_(e) || {}).name || 'GCL team'; };
    var s = 7, r = function () { s = (s * 16807) % 2147483647; return s / 2147483647; };
    var day = 864e5, now = Date.now(), rows = [], acts = [];
    orgs.forEach(function (o, i) {
      var age = Math.floor(Math.pow(r(), 1.3) * 120) + 1, created = new Date(now - age * day);
      var fn = first[i % first.length], ln = last[(i * 7) % last.length];
      var reach = Math.min(flow.length - 1, Math.floor(age / 12 * (0.6 + r() * 0.8)));
      var stage = r() < 0.06 ? 'declined' : r() < 0.05 ? 'hold' : flow[reach];
      var own = stage === 'new' ? '' : owners[i % owners.length];
      var mentor = r() < 0.55 ? 'Yes' : '';
      var c = {
        id: 'DEMO-' + ('0' + (i + 1)).slice(-2), created: created, organisation: o[0], name: fn + ' ' + ln,
        designation: ['Head of Strategy', 'VP Marketing', 'CSR Lead', 'Product Manager', 'Director, Operations'][i % 5],
        email: (fn + '.' + ln + '@' + o[0].toLowerCase().replace(/[^a-z]/g, '') + '.example').toLowerCase(), phone: '98' + String(10000000 + i * 7919).slice(0, 8),
        type: o[1], challenge: o[2] + '. We would like a fresh, research-led view and a prototype we can pilot.', link: '', mentor: mentor,
        stage: stage, stageAt: new Date(now - Math.min(age, 4 + r() * 16) * day), priority: ['High', 'Medium', 'Medium', 'Low'][i % 4], owner: own,
        facultyMentor: reach >= 3 ? ['Dr. Kavita Shah', 'Prof. Anil Joshi', 'Dr. Ritu Bhat'][i % 3] : '', industryMentor: reach >= 3 && mentor ? fn + ' ' + ln : '',
        studentTeam: reach >= 3 ? 'Team ' + String.fromCharCode(65 + (i % 26)) + (i > 25 ? '2' : '') : '',
        touchpointDate: ['team', 'insights', 'prototype', 'final', 'review'].indexOf(stage) >= 0 ? new Date(now + (r() * 24 - 4) * day) : '',
        touchpointLabel: { team: 'Kick-off with team', insights: 'Phase I: opportunity spaces', prototype: 'Prototype review', final: 'Final presentation', review: 'Scoping call' }[stage] || '',
        trackToken: Utilities.getUuid().replace(/-/g, ''), updated: new Date(now - r() * 10 * day), closedReason: '', tags: 'demo'
      };
      rows.push(c);
      var actor = own ? ownerName(own) : 'GCL team';
      acts.push({ at: created, challengeId: c.id, user: 'Website', kind: 'stage', detail: 'Challenge received', shared: true });
      var steps = stage === 'declined' || stage === 'hold' ? ['review', stage] : flow.slice(1, reach + 1);
      steps.forEach(function (st, k) {
        acts.push({ at: new Date(created.getTime() + (k + 1) * (age * day) / (steps.length + 1)), challengeId: c.id, user: actor, kind: 'stage',
          detail: 'Moved from ' + STAGE_LABEL[k ? steps[k - 1] : 'new'] + ' to ' + STAGE_LABEL[st], shared: st !== 'hold' });
      });
      if (steps.length > 2) acts.push({ at: new Date(now - r() * 5 * day), challengeId: c.id, user: actor, kind: 'note',
        detail: ['Client keen on a pilot in Q1.', 'Data sharing NDA signed.', 'Team visited the site, great access to users.', 'Mentor asked for a mid-way check-in.'][i % 4], shared: i % 2 === 0 });
      if (c.touchpointDate) acts.push({ at: new Date(now - r() * 3 * day), challengeId: c.id, user: actor, kind: 'touchpoint', detail: 'Next touchpoint: ' + c.touchpointLabel + ' on ' + fmtDate_(c.touchpointDate), shared: true });
    });
    appendMany_('Challenges', rows);
    acts.sort(function (a, b) { return a.at - b.at; });
    appendMany_('Activity', acts);
    return { challenges: rows.length, activity: acts.length };
  });
}

function removeDemoData_() {
  return withLock_(function () {
    var n = 0;
    var del = function (name, test) {
      var sh = table_(name);
      readAll_(name).filter(test).reverse().forEach(function (o) { sh.deleteRow(o._row); n++; });
    };
    var ids = readAll_('Challenges').filter(isDemoChallenge_).map(function (c) { return c.id; });
    del('Challenges', isDemoChallenge_);
    del('Activity', function (a) { return ids.indexOf(a.challengeId) >= 0; });
    del('Users', function (u) { return String(u.email).slice(-DEMO_DOMAIN.length) === DEMO_DOMAIN; });
    return { challenges: ids.length, rows: n };
  });
}

// Admin buttons in the Command Centre (Team page) and Sheet menu items.
function loadDemoData(token) { var me = requireUser_(token, 'Admin'); return seedDemo_(me.email); }
function removeDemoData(token) { requireUser_(token, 'Admin'); return removeDemoData_(); }

function menuLoadDemo() {
  var admin = readAll_('Users').filter(function (u) { return u.role === 'Admin' && u.hash; })[0];
  var r = seedDemo_(admin && admin.email);
  SpreadsheetApp.getUi().alert('Loaded ' + r.challenges + ' demo challenges (IDs DEMO-01…). Remove them any time from this menu.');
}
function menuRemoveDemo() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('Remove all demo data (DEMO- challenges, their history and demo teammates)? Real challenges are not touched.', ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  var r = removeDemoData_();
  ui.alert('Removed ' + r.challenges + ' demo challenges.');
}
