// Secret scan: fails if tracked repo files contain live secrets.
// Ignores placeholder patterns in .env.example and docs.
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const files = execSync('git ls-files', { cwd: root, encoding: 'utf8' })
  .split('\n')
  .map((f) => f.trim())
  .filter(Boolean)
  // Only scan source/config — binaries and lockfiles can false-positive on random strings.
  .filter((f) => !f.endsWith('.lock') && !f.startsWith('whatsapp-bridge/package-lock'));

const PATTERNS = [
  { name: 'Groq secret key', regex: /gsk_[A-Za-z0-9_-]{20,}/ },
  { name: 'Google API key', regex: /AIza[0-9A-Za-z_-]{35}/ },
  { name: 'Vercel token', regex: /vcp_[A-Za-z0-9]{20,}/ },
  { name: 'Netlify token (nfp_)', regex: /nfp_[A-Za-z0-9]{20,}/ },
  { name: 'Firebase PEM private key', regex: /-----BEGIN (RSA )?PRIVATE KEY-----/ },
];

const SKIP = ['.env.example', 'whatsapp-bridge/.env.example', 'README.md', 'SECURITY.md', 'docs'];

let hits = 0;
for (const file of files) {
  if (SKIP.some((s) => file.includes(s))) continue;
  const full = join(root, file);
  if (!existsSync(full)) continue;
  let content;
  try {
    content = readFileSync(full, 'utf8');
  } catch {
    continue;
  }
  for (const { name, regex } of PATTERNS) {
    if (regex.test(content)) {
      hits += 1;
      console.error(`SECRET FOUND: ${name} in ${file}`);
    }
  }
}

if (hits === 0) console.log('Secret scan PASS: no live secrets in tracked files');
else {
  console.error(`\n${hits} potential secret(s) found — rotate and remove.`);
  process.exit(1);
}
