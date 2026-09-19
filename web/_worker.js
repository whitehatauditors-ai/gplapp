const enc = new TextEncoder();

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function signature(secret, value) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value))));
}

async function validSession(request, env) {
  const match = request.headers.get('Cookie')?.match(/(?:^|;\s*)gpl_session=([^;]+)/);
  if (!match || !env.Username || !env.password) return false;
  try {
    const [payload, provided] = decodeURIComponent(match[1]).split('.');
    const expected = await signature(env.password, payload);
    if (provided.length !== expected.length) return false;
    let different = 0;
    for (let i = 0; i < expected.length; i += 1) different |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
    if (different !== 0) return false;
    const data = JSON.parse(new TextDecoder().decode(fromBase64url(payload)));
    return data.user === env.Username && Number(data.exp) > Date.now();
  } catch {
    return false;
  }
}

function loginPage(message = '', prefix = '') {
  const safeMessage = message.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const base = prefix.replace(/\/$/, '');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private Customer Portal</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07111f;color:#e5e7eb;font-family:Arial,sans-serif}.card{width:min(420px,calc(100% - 40px));padding:28px;border:1px solid #374151;border-radius:18px;background:#111827;box-shadow:0 24px 70px #0006;text-align:center}.logo{display:block;width:min(367px,100%);height:auto;margin:0 auto 22px}.card h1{font-size:25px;margin:0 0 8px}.card p{color:#94a3b8;margin:0 0 20px}.field{display:block;text-align:left;margin:12px 0 6px;font-weight:700}input{width:100%;box-sizing:border-box;padding:13px;border:1px solid #4b5563;border-radius:10px;background:#0b1220;color:#fff;font-size:16px}button{width:100%;margin-top:18px;padding:13px;border:0;border-radius:10px;background:#d71920;color:#fff;font-weight:800;font-size:16px;cursor:pointer}.error{margin-top:14px;color:#fca5a5}</style></head><body><main class="card"><img class="logo" src="${base}/assets/whitehatdata-logo.jpg" alt="White Hat Data"><h1>Private Customer Portal</h1><p>Authorized customer access only.</p><form method="post" action="${base}/api/auth"><label class="field" for="username">Username</label><input id="username" name="username" autocomplete="username" required><label class="field" for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required><button type="submit">Agree and Continue</button>${safeMessage ? `<div class="error">${safeMessage}</div>` : ''}</form></main></body></html>`;
}

function response(body, status, headers = {}) {
  return new Response(body, { status, headers: { 'cache-control': 'no-store', ...headers } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const portalPrefix = request.headers.get('X-Portal-Prefix') || '';
    if (url.pathname === '/api/auth') {
      if (request.method !== 'POST') return response('Method Not Allowed', 405);
      if (!env.Username || !env.password) return response('Portal credentials are not configured.', 503);
      const form = await request.formData();
      const username = String(form.get('username') || '');
      const password = String(form.get('password') || '');
      if (username !== env.Username || password !== env.password) return new Response(loginPage('Invalid username or password.', portalPrefix), { status: 401, headers: { 'content-type': 'text/html; charset=UTF-8', 'cache-control': 'no-store' } });
      const payload = base64url(enc.encode(JSON.stringify({ user: username, exp: Date.now() + 8 * 60 * 60 * 1000 })));
      const token = `${payload}.${await signature(env.password, payload)}`;
      return new Response(null, { status: 303, headers: { location: `${portalPrefix || ''}/`, 'set-cookie': `gpl_session=${encodeURIComponent(token)}; Max-Age=28800; Path=/; Secure; HttpOnly; SameSite=Lax`, 'cache-control': 'no-store' } });
    }
    if (url.pathname === '/' || url.pathname === '/index.html') {
      if (!(await validSession(request, env))) return new Response(loginPage('', portalPrefix), { status: 401, headers: { 'content-type': 'text/html; charset=UTF-8', 'cache-control': 'no-store' } });
    }
    // Static assets should resolve by pathname; query strings are only cache-busters.
    const assetUrl = new URL(request.url);
    assetUrl.search = '';
    return env.ASSETS.fetch(new Request(assetUrl, request));
  }
};
