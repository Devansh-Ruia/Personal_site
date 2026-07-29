// Format and lint-fix edited project files after a Codex edit.
import { appendFileSync, existsSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK_DIR = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = realpathSync(resolve(HOOK_DIR, '..', '..'));
const PATCH_PATH = /^\*\*\* (?:Add|Update) File: (.+)$/gm;
const MOVE_PATH = /^\*\*\* Move to: (.+)$/gm;
const PRETTIER_EXT = new Set([
  '.astro',
  '.css',
  '.cjs',
  '.cts',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.markdown',
  '.mdx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
]);
const ESLINT_EXT = new Set([
  '.astro',
  '.cjs',
  '.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.mts',
  '.ts',
  '.tsx',
]);
export const TOOL_SCRIPTS = Object.freeze({
  prettier: resolve(REPO_ROOT, 'node_modules', 'prettier', 'bin', 'prettier.cjs'),
  eslint: resolve(REPO_ROOT, 'node_modules', 'eslint', 'bin', 'eslint.js'),
});
const TOOL_ENV = Object.freeze({
  prettier: 'PERSONAL_SITE_PRETTIER_SCRIPT',
  eslint: 'PERSONAL_SITE_ESLINT_SCRIPT',
});

export function insideRepo(path, repoRoot = REPO_ROOT) {
  const rel = relative(repoRoot, path);
  return rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
}

function matches(pattern, text) {
  pattern.lastIndex = 0;
  return [...text.matchAll(pattern)].map((match) => match[1].trim());
}

export function explicitPaths(payload, repoRoot = REPO_ROOT) {
  const toolInput = payload?.tool_input ?? payload?.toolInput ?? {};
  if (!toolInput || typeof toolInput !== 'object') return [];

  const values = [];
  for (const key of ['file_path', 'path']) {
    if (typeof toolInput[key] === 'string') values.push(toolInput[key].trim());
  }
  for (const key of ['command', 'patch', 'input']) {
    const patch = toolInput[key];
    if (typeof patch === 'string') {
      values.push(...matches(PATCH_PATH, patch), ...matches(MOVE_PATH, patch));
    }
  }

  const payloadCwd = typeof payload?.cwd === 'string' ? payload.cwd : repoRoot;
  const cwd = isAbsolute(payloadCwd) ? payloadCwd : resolve(repoRoot, payloadCwd);
  const paths = [];
  const seen = new Set();
  for (const value of values) {
    if (!value) continue;
    try {
      const candidate = isAbsolute(value) ? resolve(value) : resolve(cwd, value);
      if (!existsSync(candidate)) continue;
      const real = realpathSync(candidate);
      if (insideRepo(real, repoRoot) && !seen.has(real)) {
        seen.add(real);
        paths.push(real);
      }
    } catch {
      // Ignore malformed, inaccessible, or concurrently removed paths.
    }
  }
  return paths;
}

export function toolsForPath(path) {
  const ext = extname(path).toLowerCase();
  const tools = [];
  if (PRETTIER_EXT.has(ext)) tools.push('prettier');
  if (ESLINT_EXT.has(ext)) tools.push('eslint');
  return tools;
}

export function runTool(tool, args, path, env = process.env) {
  const diagnosticLog = env.PERSONAL_SITE_FORMAT_LOG;
  if (diagnosticLog) {
    appendFileSync(
      diagnosticLog,
      `${JSON.stringify({ tool, args, path: relative(REPO_ROOT, path) })}\n`,
      'utf8',
    );
    return { ok: true };
  }

  const script = env[TOOL_ENV[tool]] ?? TOOL_SCRIPTS[tool];
  if (typeof script !== 'string' || !existsSync(script)) {
    return { ok: false, error: `${tool} CLI is missing` };
  }
  const result = spawnSync(process.execPath, [script, ...args, path], {
    cwd: REPO_ROOT,
    stdio: 'ignore',
  });
  if (result.error) {
    return { ok: false, error: `${tool} failed to start (${result.error.code ?? 'spawn error'})` };
  }
  if (result.signal) {
    return { ok: false, error: `${tool} stopped by ${result.signal}` };
  }
  if (result.status !== 0) {
    return { ok: false, error: `${tool} exited with status ${result.status}` };
  }
  return { ok: true };
}

export function handlePayload(payload, env = process.env) {
  const toolName = String(payload?.tool_name ?? payload?.toolName ?? '').toLowerCase();
  if (!new Set(['apply_patch', 'write', 'edit']).has(toolName)) return [];

  const results = [];
  for (const path of explicitPaths(payload)) {
    for (const tool of toolsForPath(path)) {
      const args = tool === 'eslint' ? ['--fix'] : ['--write'];
      results.push({ path, tool, ...runTool(tool, args, path, env) });
    }
  }
  return results;
}

async function main() {
  try {
    let raw = '';
    for await (const chunk of process.stdin) raw += chunk;
    const results = handlePayload(JSON.parse(raw));
    const failure = results.find((result) => !result.ok);
    if (failure) {
      process.stderr.write(`Personal_site hook: ${failure.error}.\n`);
      process.exitCode = 1;
    }
  } catch {
    // Malformed or incomplete hook payloads have nothing to process.
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
