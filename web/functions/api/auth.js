const enc = new TextEncoder();

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signature(secret, value) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value))));
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.Username || !env.password) return new Response('Portal credentials are not configured.', { status: 503 });
  const form = await request.formData();
  const username = String(form.get('username') || '');
  const password = String(form.get('password') || '');
  if (username !== env.Username || password !== env.password) {
    return new Response(`<!doctype html><meta http-equiv="refresh" content="0;url=/">`, { status: 401, headers: { 'content-type': 'text/html; charset=UTF-8', 'cache-control': 'no-store' } });
  }
  const payload = base64url(enc.encode(JSON.stringify({ user: username, exp: Date.now() + 8 * 60 * 60 * 1000 })));
  const token = `${payload}.${await signature(env.password, payload)}`;
  return new Response(null, { status: 303, headers: { location: '/', 'set-cookie': `gpl_session=${encodeURIComponent(token)}; Max-Age=28800; Path=/; Secure; HttpOnly; SameSite=Lax`, 'cache-control': 'no-store' } });
}
