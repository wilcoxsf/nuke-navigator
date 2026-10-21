// Invite tokens for the private site. Usage (run from apps/web):
//   node ops/tokens.mjs add "Name of friend"   creates a token, stores it in the TOKENS namespace, prints the link
//   node ops/tokens.mjs list                   lists tokens (names and creation dates, not the secret values)
//   node ops/tokens.mjs revoke <token>         deletes a token; it stops working within about a minute
// Tokens are also appended to ~/.config/nuke-navigator/tokens.txt (outside the repo) so the links are not lost.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const NAMESPACE = '2417dbdcbf8041078341950c98b78e85';
const SITE = process.env.NN_SITE || 'https://nuke-navigator.pages.dev';
const wr = (...a) => execFileSync('npx', ['--yes', 'wrangler', ...a], { encoding: 'utf8', shell: true });
const [cmd, arg] = process.argv.slice(2);

if (cmd === 'add') {
  const token = randomBytes(18).toString('base64url');
  wr('kv', 'key', 'put', token, JSON.stringify({ name: arg || 'unnamed', created: new Date().toISOString() }), '--namespace-id', NAMESPACE, '--remote');
  const dir = join(homedir(), '.config', 'nuke-navigator');
  mkdirSync(dir, { recursive: true });
  appendFileSync(join(dir, 'tokens.txt'), `${new Date().toISOString()}\t${arg || 'unnamed'}\t${token}\n`);
  console.log(`${SITE}/?t=${token}`);
} else if (cmd === 'list') {
  const keys = JSON.parse(wr('kv', 'key', 'list', '--namespace-id', NAMESPACE, '--remote'));
  for (const k of keys) {
    const v = JSON.parse(wr('kv', 'key', 'get', k.name, '--namespace-id', NAMESPACE, '--remote') || '{}');
    console.log(`${v.name}\t${v.created}\t${k.name.slice(0, 4)}...`);
  }
} else if (cmd === 'revoke' && arg) {
  wr('kv', 'key', 'delete', arg, '--namespace-id', NAMESPACE, '--remote');
  console.log('revoked');
} else {
  console.log('usage: node ops/tokens.mjs add "Name" | list | revoke <token>');
}
