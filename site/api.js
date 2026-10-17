// Client for the Apps Script backend (apps-script/). text/plain keeps it a "simple" CORS request, which Apps Script allows.
// The local dev server (node dev/server.js, port 8766) serves the same API at /api.
export const API_URL = location.port === '8766' ? '/api'
  : 'https://script.google.com/macros/s/AKfycbweKcjWpQeEY_NZBNFdS3mjXZIZNKd2e99bRk5fGL89_-qAKMldAvrN61NtBALL1aqG/exec';

export async function api(fn, ...args) {
  let j;
  try {
    const r = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn, args }) });
    j = await r.json();
  } catch { throw new Error('Could not reach the server. Check your connection and try again.'); }
  if (!j.ok) throw new Error(j.error);
  return j.value;
}

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
