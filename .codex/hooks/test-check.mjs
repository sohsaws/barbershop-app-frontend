import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const relevantFile = /(?:^|\/)(?:src\/|tests\/|package(?:-lock)?\.json$|(?:vite|vitest)\.config\.ts$|tsconfig[^/]*\.json$|eslint\.config\.js$|\.codex\/hooks(?:\/|\.json$))/;

export function needsTestCheck(payload) {
  if (payload.hook_event_name === 'Stop') return true;
  if (payload.hook_event_name !== 'PostToolUse') return false;
  const input = payload.tool_input;
  if (typeof input?.file_path === 'string') return relevantFile.test(input.file_path.replaceAll('\\', '/'));
  const patch = typeof input === 'string' ? input : input?.command ?? input?.patch ?? '';
  return [...patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)]
    .some((match) => relevantFile.test(match[1].trim().replaceAll('\\', '/')));
}

function fingerprint(root) {
  const files = [];
  const collect = (directory) => {
    for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) collect(path);
      else if (entry.isFile()) files.push(path);
    }
  };
  collect('src');
  collect('tests');
  collect('.codex/hooks');
  for (const entry of readdirSync(root)) {
    if (relevantFile.test(entry)) files.push(entry);
  }
  files.push('.codex/hooks.json');
  const hash = createHash('sha256').update(process.version);
  for (const file of files.sort()) hash.update(file).update(readFileSync(join(root, file)));
  return hash.digest('hex');
}

export function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
    if (!needsTestCheck(payload)) return console.log('{}');
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const key = createHash('sha256').update(root).digest('hex').slice(0, 20);
    const cachePath = join(tmpdir(), `barbershop-test-check-${key}.json`);
    const hash = fingerprint(root);
    let cache = {};
    try { cache = JSON.parse(readFileSync(cachePath, 'utf8')); } catch { /* First run has no cached result. */ }
    if (cache.hash === hash && cache.passed) return console.log('{}');
    if (payload.stop_hook_active && cache.hash === hash && !cache.passed) {
      return console.log(JSON.stringify({ systemMessage: 'Test checks still fail. Report the failure and its limits; do not claim success.' }));
    }
    const executable = process.platform === 'win32' ? 'cmd.exe' : 'npm';
    const args = process.platform === 'win32' ? ['/d', '/s', '/c', 'npm.cmd run test:check'] : ['run', 'test:check'];
    const result = spawnSync(executable, args, {
      cwd: root, encoding: 'utf8',
      timeout: 90000, windowsHide: true, env: { ...process.env, CI: 'true' },
    });
    const passed = result.status === 0;
    writeFileSync(cachePath, JSON.stringify({ hash, passed }));
    const reason = `Test checks failed. Fix tests or report the blocker.\n${result.error?.message ?? ''}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`.slice(-6000);
    console.log(JSON.stringify(passed ? {} : { decision: 'block', reason }));
  } catch (error) {
    console.log(JSON.stringify({ decision: 'block', reason: `Test-check hook failed: ${error.message}` }));
  }
}
