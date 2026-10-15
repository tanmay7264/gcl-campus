/**
 * GCL partner form -> Google Sheet.
 * Setup: create a Google Sheet -> Extensions -> Apps Script -> paste this file -> Deploy -> New deployment
 * -> type "Web app", Execute as "Me", Who has access "Anyone" -> copy the /exec URL into SCRIPT_URL in site/main.js.
 */
const FIELDS = ['organisation', 'name', 'designation', 'email', 'phone', 'type', 'challenge', 'link', 'mentor'];

function doPost(e) {
  const p = e.parameter;
  if (p.website) return ContentService.createTextOutput('ok'); // honeypot: silently drop bots
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) sheet.appendRow(['timestamp'].concat(FIELDS));
  // Leading "'" stops formula injection when a value starts with = + - @
  sheet.appendRow([new Date()].concat(FIELDS.map(f => String(p[f] || '').replace(/^([=+\-@])/, "'$1").slice(0, 5000))));
  return ContentService.createTextOutput('ok');
}
