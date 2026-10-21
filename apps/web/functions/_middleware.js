// Token gate for the whole site: every request, including static assets, needs a valid invite token.
// A token arrives as ?t=... on the first visit, is checked against the TOKENS KV namespace, and is kept in a cookie so the page's own
// asset requests pass. Revoke an invite by deleting its key (ops/tokens.mjs revoke <token>); there are no passwords and no accounts.
const cache = new Map(); // token -> expiry ms; keeps KV reads low (a revoked token stops working within about a minute)
const TTL = 60_000;

async function valid(env, token) {
  if (!token || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) return false;
  const hit = cache.get(token);
  if (hit && hit > Date.now()) return true;
  const rec = await env.TOKENS.get(token);
  if (rec === null) {
    cache.delete(token);
    return false;
  }
  cache.set(token, Date.now() + TTL);
  return true;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const fromUrl = url.searchParams.get('t');
  const m = /(?:^|;\s*)nn_t=([^;]+)/.exec(request.headers.get('Cookie') || '');
  const token = fromUrl || (m ? m[1] : null);
  if (await valid(env, token)) {
    const res = await next();
    const headers = new Headers(res.headers);
    if (fromUrl) headers.append('Set-Cookie', `nn_t=${fromUrl}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`);
    headers.set('Cache-Control', 'private, max-age=600');
    headers.set('X-Robots-Tag', 'noindex, nofollow');
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }
  return new Response('This link is private. Ask for an invite.', {
    status: 403,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' },
  });
}
