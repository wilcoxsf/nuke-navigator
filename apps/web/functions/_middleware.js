// The gate for the whole site (11 Nov 2026: passwords, not invite links; lib/auth.js). Every request needs a signed-in session, except the sign-in page and the
// sign-in call. Someone still on the password Andrew gave them is sent to pick their own before anything else. The old ?t= invite links no longer work.
import { whoIs, LOGIN_HTML } from '../lib/auth.js'
const page = (html, status = 200) => new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } })
const OPEN = new Set(['/login', '/api/login'])
export async function onRequest({ request, env, next }) {
  const url = new URL(request.url), path = url.pathname
  if (OPEN.has(path)) {
    if (path === '/login' && request.method === 'GET') { const w = await whoIs(request, env); if (w && !w.user.must && !url.searchParams.has('set')) return Response.redirect(new URL('/', url), 302); return page(LOGIN_HTML(w?.user.must || url.searchParams.has('set') ? (w ? 'set' : 'in') : 'in')) }
    return next()
  }
  const w = await whoIs(request, env)
  if (!w) return path.startsWith('/api/') ? new Response(JSON.stringify({ error: 'sign in' }), { status: 401, headers: { 'content-type': 'application/json' } }) : Response.redirect(new URL('/login', url), 302)
  if (w.user.must && path !== '/api/password' && path !== '/api/logout') return path.startsWith('/api/') ? new Response(JSON.stringify({ error: 'pick a password first' }), { status: 403, headers: { 'content-type': 'application/json' } }) : Response.redirect(new URL('/login?set=1', url), 302)
  const res = await next(), headers = new Headers(res.headers)
  headers.set('Cache-Control', path.startsWith('/api/') ? 'no-store' : 'private, max-age=600')
  headers.set('X-Robots-Tag', 'noindex, nofollow')
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers })
}
