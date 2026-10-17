// Named users with roles (Admin, Coordinator). Passwords are stored only as an iterated salted SHA-256.
// Sessions live in CacheService (max 6h), and repeated failed sign-ins are throttled per email.

var SESSION_TTL_SEC = 6 * 60 * 60;
var HASH_ROUNDS = 300; // ponytail: iterated SHA-256 (no bcrypt in Apps Script); raise if sign-in stays fast

function hash_(salt, pass) {
  var h = salt + pass;
  for (var i = 0; i < HASH_ROUNDS; i++) {
    h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h + salt, Utilities.Charset.UTF_8)
      .map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join('');
  }
  return h;
}

function findUser_(email) {
  email = String(email || '').trim().toLowerCase();
  return readAll_('Users').filter(function (u) { return String(u.email).toLowerCase() === email; })[0] || null;
}

function publicUser_(u) { return { email: u.email, name: u.name, role: u.role, active: u.active === true || u.active === 'TRUE' }; }

function upsertUser_(data, pass) {
  return withLock_(function () {
    var u = findUser_(data.email);
    var o = u || { email: String(data.email).toLowerCase(), created: new Date() };
    o.name = clean_(data.name, 80) || o.name || o.email;
    o.role = data.role === 'Admin' ? 'Admin' : 'Coordinator';
    o.active = data.active !== false;
    if (pass) { o.salt = Utilities.getUuid(); o.hash = hash_(o.salt, pass); o.inviteCode = ''; o.inviteExpires = ''; }
    if (u) write_('Users', o); else append_('Users', o);
    return o;
  });
}

function login(email, pass) {
  email = String(email || '').trim().toLowerCase();
  var cache = CacheService.getScriptCache(), key = 'fail_' + email;
  var fails = Number(cache.get(key) || 0);
  if (fails >= 5) throw new Error('Too many failed attempts. Try again in 10 minutes.');
  var u = findUser_(email);
  if (u && u.hash && publicUser_(u).active && hash_(u.salt, String(pass || '')) === u.hash) {
    cache.remove(key);
    var token = Utilities.getUuid() + Utilities.getUuid();
    cache.put('tok_' + token, u.email, SESSION_TTL_SEC);
    return { token: token, user: publicUser_(u) };
  }
  cache.put(key, String(fails + 1), 600);
  throw new Error('Invalid email or password.');
}

function logout(token) { CacheService.getScriptCache().remove('tok_' + token); return true; }

// Returns the signed-in user or throws. role = 'Admin' to require an admin.
function requireUser_(token, role) {
  var email = token && CacheService.getScriptCache().get('tok_' + token);
  var u = email && findUser_(email);
  if (!u || !publicUser_(u).active) throw new Error('SESSION_EXPIRED');
  if (role === 'Admin' && u.role !== 'Admin') throw new Error('Only Admins can do that.');
  return publicUser_(u);
}

// Admins add or edit teammates. New users get an emailed invite link to choose their own password,
// so no password ever passes through the admin's hands.
function saveUser(token, data) {
  var me = requireUser_(token, 'Admin');
  data = data || {};
  var email = String(data.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error('Please enter a valid email address.');
  if (email === me.email && (data.active === false || data.role !== 'Admin')) throw new Error('You cannot demote or deactivate yourself.');
  var existing = findUser_(email);
  var u = upsertUser_({ email: email, name: data.name, role: data.role, active: data.active });
  if (!existing || data.resendInvite) {
    var code = Utilities.getUuid().replace(/-/g, '');
    withLock_(function () {
      var fresh = findUser_(email);
      fresh.inviteCode = code; fresh.inviteExpires = new Date(Date.now() + 7 * 864e5);
      write_('Users', fresh);
    });
    var link = SITE_URL + 'admin/#invite=' + code;
    MailApp.sendEmail({
      to: email, name: 'WeSchool GCL', replyTo: me.email,
      subject: 'You have been added to the GCL Command Centre',
      htmlBody: emailShell_('You are invited to the GCL Command Centre',
        '<p>' + esc_(me.name) + ' added you as a <b>' + esc_(u.role) + '</b> on the WeSchool GCL Command Centre, where we track partner challenges from submission to final solution.</p>' +
        '<p>Choose your password to get started (the link works for 7 days):</p>' + button_(link, 'Set my password'))
    });
  }
  return publicUser_(findUser_(email));
}

function acceptInvite(code, pass) {
  code = String(code || '');
  if (String(pass || '').length < 8) throw new Error('Password must be at least 8 characters.');
  var u = code.length > 20 && readAll_('Users').filter(function (x) { return x.inviteCode === code; })[0];
  if (!u || !(new Date(u.inviteExpires) > new Date())) throw new Error('This invite link has expired. Ask an Admin to resend it.');
  upsertUser_(publicUser_(u), pass);
  return login(u.email, pass);
}
