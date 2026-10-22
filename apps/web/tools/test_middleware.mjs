// Unit test of the token gate with a fake KV: good link, bad link, good cookie, bad link plus good cookie (must pass), nothing, revoked.
import { onRequest } from '../functions/_middleware.js'

const GOOD = 'goodtoken_AAAAAAAAAAAAAAAA', OLD = 'oldtoken__BBBBBBBBBBBBBBBB'
const env = { TOKENS: { get: async (k) => (k === GOOD ? '{}' : null) } }
const next = async () => new Response('page', { status: 200 })
let fails = 0
const run = async (name, url, cookie, want) => {
  const req = new Request(url, cookie ? { headers: { Cookie: cookie } } : {})
  const res = await onRequest({ request: req, env, next })
  const ok = res.status === want
  if (!ok) fails++
  console.log(ok ? 'PASS' : 'FAIL', name, '->', res.status, res.headers.get('Set-Cookie') ? '(sets cookie)' : '')
}
await run('good link token', `https://x.test/?t=${GOOD}`, null, 200)
await run('bad link token, no cookie', `https://x.test/?t=${OLD}`, null, 403)
await run('good cookie only', 'https://x.test/', `nn_t=${GOOD}`, 200)
await run('bad link token but good cookie (was 403)', `https://x.test/?t=${OLD}`, `nn_t=${GOOD}`, 200)
await run('malformed link token but good cookie', 'https://x.test/?t=@@', `nn_t=${GOOD}`, 200)
await run('good link token, stale cookie', `https://x.test/?t=${GOOD}`, `nn_t=${OLD}`, 200)
await run('nothing', 'https://x.test/', null, 403)
await run('revoked cookie', 'https://x.test/', `nn_t=${OLD}`, 403)
console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
process.exit(fails ? 1 : 0)
