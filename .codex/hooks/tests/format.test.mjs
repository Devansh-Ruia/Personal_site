import assert from 'node:assert/strict';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { explicitPaths, REPO_ROOT, runTool, TOOL_SCRIPTS, toolsForPath } from '../format.mjs';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(TEST_DIR, '..', 'format.mjs');
const HAS_TOOLING = Object.values(TOOL_SCRIPTS).every((script) => existsSync(script));
const CONTROL_ENV = [
  'PERSONAL_SITE_FORMAT_LOG',
  'PERSONAL_SITE_PRETTIER_SCRIPT',
  'PERSONAL_SITE_ESLINT_SCRIPT',
];
const HOOKS_CONFIG = JSON.parse(readFileSync(resolve(REPO_ROOT, '.codex', 'hooks.json'), 'utf8'));
const CONFIGURED_HOOK = HOOKS_CONFIG.hooks.PostToolUse[0].hooks[0];

function runHook(payload, cwd = REPO_ROOT, env = {}) {
  const childEnv = { ...process.env };
  for (const key of CONTROL_ENV) delete childEnv[key];
  Object.assign(childEnv, env);
  return spawnSync(process.execPath, [HOOK], {
    cwd,
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
    env: childEnv,
  });
}

function runConfiguredHook(payload, cwd) {
  const childEnv = { ...process.env };
  for (const key of CONTROL_ENV) delete childEnv[key];
  const command =
    process.platform === 'win32' && CONFIGURED_HOOK.commandWindows
      ? CONFIGURED_HOOK.commandWindows
      : CONFIGURED_HOOK.command;
  return spawnSync(command, [], {
    cwd,
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: childEnv,
    shell: true,
  });
}

test('parses canonical apply_patch command and deduplicates paths from a subdirectory', () => {
  const fixtureDir = mkdtempSync(join(resolve(REPO_ROOT, '.codex'), 'hook-fixture-'));
  try {
    const ts = join(fixtureDir, 'fixture.ts');
    writeFileSync(ts, 'const value=1\n');
    const payload = {
      tool_name: 'apply_patch',
      tool_input: {
        command: [
          '*** Begin Patch',
          '*** Update File: fixture.ts',
          '*** Move to: fixture.ts',
          '*** End Patch',
        ].join('\n'),
        patch: '*** Update File: fixture.ts',
        input: '*** Update File: fixture.ts',
      },
      cwd: fixtureDir,
    };

    assert.deepEqual(explicitPaths(payload), [realpathSync(ts)]);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('parses Write and Edit path payloads', () => {
  const fixtureDir = mkdtempSync(join(resolve(REPO_ROOT, '.codex'), 'hook-fixture-'));
  try {
    const mdx = join(fixtureDir, 'fixture.mdx');
    writeFileSync(mdx, '# Fixture\n');
    const expected = [realpathSync(mdx)];

    assert.deepEqual(
      explicitPaths({
        tool_name: 'Write',
        tool_input: { file_path: 'fixture.mdx', input: '# Changed\n' },
        cwd: fixtureDir,
      }),
      expected,
    );
    assert.deepEqual(
      explicitPaths({
        toolName: 'Edit',
        toolInput: { path: 'fixture.mdx', patch: '# Changed again\n' },
        cwd: fixtureDir,
      }),
      expected,
    );
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('rejects paths whose real locations are outside the repository', (t) => {
  const fixtureDir = mkdtempSync(join(resolve(REPO_ROOT, '.codex'), 'hook-fixture-'));
  const outsideDir = mkdtempSync(join(tmpdir(), 'codex-hook-outside-'));
  const outside = join(outsideDir, 'outside.astro');
  const linkDir = join(fixtureDir, 'linked-outside');
  writeFileSync(outside, '<p>outside</p>\n');

  try {
    assert.deepEqual(
      explicitPaths({
        tool_name: 'Write',
        tool_input: { file_path: outside },
        cwd: fixtureDir,
      }),
      [],
    );

    try {
      symlinkSync(outsideDir, linkDir, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (error && ['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) {
        t.skip(`symlink creation is unavailable: ${error.code}`);
        return;
      }
      throw error;
    }

    assert.deepEqual(
      explicitPaths({
        tool_name: 'Edit',
        tool_input: { path: join(linkDir, 'outside.astro') },
        cwd: fixtureDir,
      }),
      [],
    );
  } finally {
    if (existsSync(linkDir)) unlinkSync(linkDir);
    rmSync(fixtureDir, { recursive: true, force: true });
    rmSync(outsideDir, { recursive: true, force: true });
  }
});

test('plans local Prettier and ESLint for every supported extension', () => {
  const both = ['.astro', '.cjs', '.cts', '.js', '.jsx', '.mjs', '.mts', '.ts', '.tsx'];
  const prettierOnly = ['.css', '.json', '.md', '.markdown', '.mdx'];

  for (const extension of both) {
    assert.deepEqual(toolsForPath(`fixture${extension}`), ['prettier', 'eslint']);
  }
  for (const extension of prettierOnly) {
    assert.deepEqual(toolsForPath(`fixture${extension}`), ['prettier']);
  }
  assert.deepEqual(toolsForPath('fixture.txt'), []);

  for (const script of Object.values(TOOL_SCRIPTS)) {
    assert.equal(relative(REPO_ROOT, script).split(/[\\/]/)[0], 'node_modules');
  }
});

test('missing local tools do not throw or report success', () => {
  const fixtureDir = mkdtempSync(join(resolve(REPO_ROOT, '.codex'), 'hook-fixture-'));
  try {
    const css = join(fixtureDir, 'fixture.css');
    writeFileSync(css, 'body{color:red}\n');
    assert.deepEqual(runTool('missing', ['--write'], css, {}), {
      ok: false,
      error: 'missing CLI is missing',
    });
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('passes diagnostic logging controls to the child hook', () => {
  const fixtureDir = mkdtempSync(join(resolve(REPO_ROOT, '.codex'), 'hook-fixture-'));
  try {
    const astro = join(fixtureDir, 'fixture.astro');
    const log = join(fixtureDir, 'format.jsonl');
    writeFileSync(astro, '<h1>Fixture</h1>\n');
    const result = runHook(
      {
        tool_name: 'Edit',
        tool_input: { path: 'fixture.astro' },
        cwd: fixtureDir,
      },
      fixtureDir,
      { PERSONAL_SITE_FORMAT_LOG: log },
    );
    assert.equal(result.status, 0, result.stderr);
    const entries = readFileSync(log, 'utf8')
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    assert.deepEqual(
      entries.map(({ tool, args }) => ({ tool, args })),
      [
        { tool: 'prettier', args: ['--write'] },
        { tool: 'eslint', args: ['--fix'] },
      ],
    );
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('missing formatter and linter scripts fail the child hook', () => {
  const fixtureDir = mkdtempSync(join(resolve(REPO_ROOT, '.codex'), 'hook-fixture-'));
  try {
    const success = join(fixtureDir, 'success.mjs');
    const missing = join(fixtureDir, 'missing.mjs');
    writeFileSync(success, 'process.exit(0);\n');

    const fixtures = [
      {
        name: 'fixture.mdx',
        contents: '# Fixture\n',
        env: { PERSONAL_SITE_PRETTIER_SCRIPT: missing },
        expected: /prettier CLI is missing/,
      },
      {
        name: 'fixture.ts',
        contents: 'const value = 1;\n',
        env: {
          PERSONAL_SITE_PRETTIER_SCRIPT: success,
          PERSONAL_SITE_ESLINT_SCRIPT: missing,
        },
        expected: /eslint CLI is missing/,
      },
    ];

    for (const fixture of fixtures) {
      writeFileSync(join(fixtureDir, fixture.name), fixture.contents);
      const result = runHook(
        {
          tool_name: 'Edit',
          tool_input: { path: fixture.name },
          cwd: fixtureDir,
        },
        fixtureDir,
        fixture.env,
      );
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, fixture.expected);
    }
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('formatter and linter exit codes fail the child hook', () => {
  const fixtureDir = mkdtempSync(join(resolve(REPO_ROOT, '.codex'), 'hook-fixture-'));
  try {
    const success = join(fixtureDir, 'success.mjs');
    const exitSeven = join(fixtureDir, 'exit-seven.mjs');
    writeFileSync(success, 'process.exit(0);\n');
    writeFileSync(exitSeven, 'process.exit(7);\n');

    const fixtures = [
      {
        name: 'fixture.mdx',
        contents: '# Fixture\n',
        env: { PERSONAL_SITE_PRETTIER_SCRIPT: exitSeven },
        expected: /prettier exited with status 7/,
      },
      {
        name: 'fixture.ts',
        contents: 'const value = 1;\n',
        env: {
          PERSONAL_SITE_PRETTIER_SCRIPT: success,
          PERSONAL_SITE_ESLINT_SCRIPT: exitSeven,
        },
        expected: /eslint exited with status 7/,
      },
    ];

    for (const fixture of fixtures) {
      writeFileSync(join(fixtureDir, fixture.name), fixture.contents);
      const result = runHook(
        {
          tool_name: 'Edit',
          tool_input: { path: fixture.name },
          cwd: fixtureDir,
        },
        fixtureDir,
        fixture.env,
      );
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, fixture.expected);
    }
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test('formats a disposable Astro fixture from a subdirectory', { skip: !HAS_TOOLING }, () => {
  const fixtureDir = mkdtempSync(join(resolve(REPO_ROOT, '.codex'), 'astro-fixture-'));
  try {
    const astro = join(fixtureDir, 'fixture.astro');
    const before = '---\nconst title="Hello"\n---\n<h1>{title}</h1>\n';
    writeFileSync(astro, before);
    const result = runHook(
      {
        tool_name: 'Edit',
        tool_input: { file_path: 'fixture.astro' },
        cwd: fixtureDir,
      },
      fixtureDir,
    );
    assert.equal(result.status, 0, result.stderr);
    const after = readFileSync(astro, 'utf8');
    assert.notEqual(after, before);
    assert.match(after, /const title = 'Hello';/);
  } finally {
    rmSync(fixtureDir, { recursive: true, force: true });
  }
});

test(
  'configured platform hook command resolves the repository root from a nested cwd',
  {
    skip: !HAS_TOOLING,
  },
  () => {
    const fixtureDir = mkdtempSync(join(resolve(REPO_ROOT, '.codex'), 'astro-fixture-'));
    const nestedDir = resolve(REPO_ROOT, 'src');
    try {
      const astro = join(fixtureDir, 'configured.astro');
      const before = '---\nconst title="Configured"\n---\n<h1>{title}</h1>\n';
      writeFileSync(astro, before);
      const result = runConfiguredHook(
        {
          tool_name: 'Edit',
          tool_input: { file_path: relative(nestedDir, astro) },
          cwd: nestedDir,
        },
        nestedDir,
      );

      assert.equal(result.status, 0, result.stderr);
      const after = readFileSync(astro, 'utf8');
      assert.notEqual(after, before, 'configured hook command did not invoke the formatter');
      assert.match(after, /const title = 'Configured';/);
    } finally {
      rmSync(fixtureDir, { recursive: true, force: true });
    }
  },
);

test('malformed payloads exit successfully', () => {
  const result = runHook('{not-json');
  assert.equal(result.status, 0, result.stderr);
});
