// POST /api/logout: ends this session (11 Nov 2026; lib/auth.js)
import { sessionId } from '../../lib/auth.js'
export async function onRequest({ request, env }) {
  const sid = sessionId(request); if (sid) await env.TOKENS.delete('s:' + sid)
  return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json', 'Set-Cookie': 'nn_s=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' } })
}
