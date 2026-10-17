// Stakeholder emails: stage updates to the company, the weekly digest to Admins, and the shared HTML shell.
// Templates are plain text so the team can edit them in the Command Centre before sending.

var TEMPLATES = {
  received: ['We have received your challenge ({id})',
    'Thank you for sharing a challenge with the WeSchool Global Citizen Leaders (GCL) programme. Our team will review it and get back to you shortly.\n\nWhat happens next: we check fit and scope, then confirm whether a Post Graduate management team can take it up as a live project this cycle.'],
  review: ['Your GCL challenge is under review ({id})',
    'Our GCL team is reviewing your challenge. We may reach out to fine-tune the problem statement with you so the student team starts with a sharp brief.'],
  accepted: ['Your challenge has been accepted for GCL ({id})',
    'Good news: your challenge has been accepted as a GCL live project.\n\nWhat happens next: we form a diverse student team and assign a faculty mentor. Your first touchpoint is a short session to fine-tune the challenge with the team.'],
  team: ['Meet your GCL team ({id})',
    'A student team has been formed for your challenge and a faculty mentor assigned.\n\nYour role now: a short kick-off to share context, data you are comfortable sharing, and what a great outcome looks like.'],
  stakeholders: ['Update: stakeholder mapping has started ({id})',
    'The team is mapping everyone your challenge touches: customers, staff, partners and regulators. If there are people we should speak to, just reply to this email.'],
  journey: ['Update: mapping the customer journey ({id})',
    'The team is mapping the end-to-end journey for the people affected by your challenge, step by step, to find where things break down.'],
  insights: ['Update: research insights and opportunity spaces ({id})',
    'The team has moved into observations and insights, and will shortly present three opportunity spaces to you (Phase I). Your feedback here shapes what gets prototyped.'],
  prototype: ['Update: your prototype is being built ({id})',
    'Based on your feedback, the team is building a prototype using new-age tech. We will invite you to review it and share feedback before the final solution.'],
  final: ['Invitation: final presentation of your GCL project ({id})',
    'The team is ready to present a commercially feasible solution to your challenge. We will share the date and joining details shortly. We would love you (and colleagues) to attend.'],
  completed: ['Thank you: your GCL project is complete ({id})',
    'Your GCL project is complete. Thank you for partnering with WeSchool. The final deck and prototype are yours to keep, and we would love to work with you again next cycle.'],
  hold: ['Your GCL challenge is on hold ({id})',
    'We have put your challenge on hold for now. We will be in touch before the next GCL cycle.'],
  declined: ['About your GCL challenge ({id})',
    'Thank you for sharing your challenge. After careful review, we are unable to take it up as a GCL project this cycle. We would be glad to consider a new challenge in the future.']
};

function composeMail_(c, template, message) {
  var t = TEMPLATES[template] || TEMPLATES.review;
  var body = 'Dear ' + (String(c.name).split(' ')[0] || 'colleague') + ',\n\n' + t[1].replace(/\{id\}/g, c.id) +
    (message ? '\n\n' + String(message).trim() : '') +
    '\n\nYou can follow your challenge any time on your private tracking page:\n' + trackUrl_(c) +
    '\n\nWarm regards,\nGCL Team, WeSchool (Welingkar Institute of Management)';
  return { to: c.email, subject: t[0].replace(/\{id\}/g, c.id), body: body, template: template };
}

// Sends a stage email to the company contact and logs it (shared, so it shows on their tracker).
function mail_(c, template, message, me) {
  var m = composeMail_(c, template, message);
  if (isDemoAddress_(m.to)) return; // demo data never sends email
  MailApp.sendEmail({
    to: m.to, name: 'WeSchool GCL', replyTo: me ? me.email : '', subject: m.subject,
    htmlBody: emailShell_(esc_(m.subject), esc_(m.body).replace(/\n/g, '<br>') + '<p style="margin-top:22px">' + button_(trackUrl_(c), 'Track your challenge') + '</p>')
  });
  withLock_(function () { log_(c.id, me || { name: 'GCL Command Centre' }, 'email', 'Update emailed to the company contact: ' + m.subject, true); });
}

function weeklyDigest() {
  var admins = readAll_('Users').filter(function (u) { return u.role === 'Admin' && publicUser_(u).active; }).map(function (u) { return u.email; });
  if (!admins.length) return;
  var now = Date.now(), day = 864e5, all = readAll_('Challenges');
  var open = all.filter(function (c) { return ['completed', 'declined'].indexOf(c.stage) < 0; });
  var fresh = all.filter(function (c) { return now - new Date(c.created) < 7 * day; });
  var stuck = open.filter(function (c) { return c.stage !== 'hold' && now - new Date(c.stageAt) > 7 * day; });
  var soon = open.filter(function (c) { return c.touchpointDate && new Date(c.touchpointDate) - now < 14 * day && new Date(c.touchpointDate) - now > -day; });
  var unowned = open.filter(function (c) { return !c.owner; });
  var list = function (title, rows, fn) {
    return '<h3 style="font-size:15px;margin:22px 0 6px">' + title + ' (' + rows.length + ')</h3>' + (rows.length
      ? '<ul style="padding-left:18px;margin:0">' + rows.slice(0, 15).map(function (c) { return '<li><a href="' + SITE_URL + 'admin/#c=' + c.id + '">' + c.id + '</a> · ' + esc_(c.organisation) + ' · ' + fn(c) + '</li>'; }).join('') + '</ul>'
      : '<p style="color:#7A7590;margin:0">Nothing here.</p>');
  };
  MailApp.sendEmail({
    to: admins.join(','), name: 'GCL Command Centre', subject: 'GCL weekly digest: ' + fresh.length + ' new, ' + stuck.length + ' stuck, ' + soon.length + ' touchpoints ahead',
    htmlBody: emailShell_('Your GCL week at a glance',
      '<p>' + open.length + ' challenges in progress · ' + all.filter(function (c) { return c.stage === 'completed'; }).length + ' completed.</p>' +
      list('New this week', fresh, function (c) { return esc_(c.type); }) +
      list('Touchpoints in the next 14 days', soon, function (c) { return esc_(c.touchpointLabel || 'Touchpoint') + ' on ' + fmtDate_(c.touchpointDate); }) +
      list('Stuck for over 7 days', stuck, function (c) { return STAGE_LABEL[c.stage]; }) +
      list('No owner yet', unowned, function (c) { return STAGE_LABEL[c.stage]; }) +
      taskList_(readAll_('Tasks').filter(function (t) { return t.status !== 'done' && t.due && new Date(t.due) < now; })) +
      button_(SITE_URL + 'admin/', 'Open the Command Centre'))
  });
}

function taskList_(rows) {
  return '<h3 style="font-size:15px;margin:22px 0 6px">Overdue tasks (' + rows.length + ')</h3>' + (rows.length
    ? '<ul style="padding-left:18px;margin:0">' + rows.slice(0, 15).map(function (t) { return '<li>' + esc_(t.title) + ' · due ' + fmtDate_(t.due) + ' · ' + Number(t.progress || 0) + '%' + (t.challengeId ? ' · ' + t.challengeId : '') + '</li>'; }).join('') + '</ul>'
    : '<p style="color:#7A7590;margin:0">Nothing overdue.</p>');
}

function esc_(s) {
  return String(s === null || s === undefined ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function button_(href, label) {
  return '<a href="' + href + '" style="display:inline-block;background:#66518A;color:#fff;text-decoration:none;font-weight:600;padding:11px 18px;border-radius:10px">' + esc_(label) + '</a>';
}

function emailShell_(title, inner) {
  return '<div style="background:#F6F4FA;padding:24px 12px;font-family:Inter,Segoe UI,Arial,sans-serif;color:#1F1B2D">' +
    '<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E6E2EF">' +
    '<div style="height:6px;background:linear-gradient(90deg,#66518A,#7AA342,#E8892B)"></div>' +
    '<div style="padding:22px 26px 26px;font-size:14px;line-height:1.55">' +
    '<div style="font-size:11px;font-weight:700;letter-spacing:.6px;color:#E8892B">WESCHOOL · GLOBAL CITIZEN LEADERS</div>' +
    '<h2 style="font-size:19px;margin:6px 0 14px">' + title + '</h2>' + inner + '</div></div>' +
    '<p style="text-align:center;font-size:11px;color:#9A95AD;margin:14px 0 0">WeSchool GCL · <a href="' + SITE_URL + '" style="color:#9A95AD">GCL Campus</a></p></div>';
}
