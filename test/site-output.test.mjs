import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const knownOrigin = 'https://portfolio.test';

const readOutput = (...parts) => readFileSync(join(dist, ...parts), 'utf8');

const listFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });

const htmlFiles = () => listFiles(dist).filter((file) => extname(file).toLowerCase() === '.html');

const runBuild = (site) => {
  const env = { ...process.env };
  if (site === undefined) delete env.SITE_URL;
  else env.SITE_URL = site;

  const npmCli = process.env.npm_execpath;
  const command = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const args = npmCli ? [npmCli, 'run', 'build'] : ['run', 'build'];

  return spawnSync(command, args, {
    cwd: root,
    env,
    encoding: 'utf8',
  });
};

const buildOutput = (result) => `${result.stdout ?? ''}\n${result.stderr ?? ''}`;

const assertBuildSucceeded = (result, label) => {
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${label} failed:\n${buildOutput(result)}`);
};

test('build emits the public routes and static launch assets', () => {
  const expected = [
    'index.html',
    'about/index.html',
    'fv/index.html',
    'projects/index.html',
    'projects/function-vectors-reproduction/index.html',
    'projects/langgraph-work/index.html',
    'projects/legacy-lens-ai/index.html',
    'projects/unreal-engine-work/index.html',
    '404.html',
    'robots.txt',
    'favicon.svg',
    'social-card.png',
  ];

  for (const path of expected) {
    assert.ok(existsSync(join(dist, path)), `missing dist/${path}`);
  }
});

test('drafts are absent from routes and generated indexes', () => {
  assert.ok(!existsSync(join(dist, 'projects/function-vectors-notes/index.html')));
  assert.doesNotMatch(readOutput('projects', 'index.html'), /Function vectors: intervention notes/);
});

test('site metadata and configuration require an exact supported origin', () => {
  const unconfiguredHome = readOutput('index.html');
  assert.match(unconfiguredHome, /<meta name="description"/);
  assert.match(unconfiguredHome, /<meta property="og:title"/);
  assert.match(unconfiguredHome, /<meta name="twitter:card" content="summary"/);
  assert.doesNotMatch(unconfiguredHome, /<link rel="canonical"/);
  assert.doesNotMatch(unconfiguredHome, /<meta property="og:(?:url|image)"/);
  assert.doesNotMatch(unconfiguredHome, /<meta name="twitter:image"/);
  assert.ok(!existsSync(join(dist, 'sitemap-index.xml')));

  try {
    const configuredBuild = runBuild(knownOrigin);
    assertBuildSucceeded(configuredBuild, 'configured build');

    const configuredHome = readOutput('index.html');
    assert.ok(configuredHome.includes(`<link rel="canonical" href="${knownOrigin}/">`));
    assert.ok(configuredHome.includes(`<meta property="og:url" content="${knownOrigin}/">`));
    assert.ok(
      configuredHome.includes(
        `<meta property="og:image" content="${knownOrigin}/social-card.png">`,
      ),
    );
    assert.ok(
      configuredHome.includes(
        `<meta name="twitter:image" content="${knownOrigin}/social-card.png">`,
      ),
    );
    assert.match(configuredHome, /<meta name="twitter:card" content="summary_large_image">/);

    const sitemapIndex = readOutput('sitemap-index.xml');
    const sitemap = readOutput('sitemap-0.xml');
    assert.ok(sitemapIndex.includes(`<loc>${knownOrigin}/sitemap-0.xml</loc>`));
    assert.ok(
      sitemap.includes(`<loc>${knownOrigin}/projects/function-vectors-reproduction/</loc>`),
    );
    assert.doesNotMatch(sitemap, /function-vectors-notes/);
    assert.equal(
      readOutput('robots.txt'),
      `User-agent: *\nAllow: /\nSitemap: ${knownOrigin}/sitemap-index.xml\n`,
    );

    const unsupportedSites = [
      'https://user:password@portfolio.test',
      'https://portfolio.test/path',
      'https://portfolio.test/?query=1',
      'https://portfolio.test/#section',
      'ftp://portfolio.test',
    ];

    for (const site of unsupportedSites) {
      const rejectedBuild = runBuild(site);
      assert.ifError(rejectedBuild.error);
      assert.notEqual(rejectedBuild.status, 0, `${site} should be rejected`);
      assert.match(
        buildOutput(rejectedBuild),
        /SITE_URL must be an http\(s\) origin without credentials, a path, a query, or a hash/,
      );
    }
  } finally {
    assertBuildSucceeded(runBuild(), 'unconfigured restore build');
  }

  const restoredHome = readOutput('index.html');
  assert.doesNotMatch(restoredHome, /portfolio\.test|rel="canonical"/);
  assert.ok(!existsSync(join(dist, 'sitemap-index.xml')));
});

test('undated project pages still identify themselves as articles', () => {
  const project = readOutput('projects', 'function-vectors-reproduction', 'index.html');

  assert.match(project, /<meta property="og:type" content="article"/);
  assert.doesNotMatch(project, /article:published_time/);
});

test('404 is noindex and robots exposes only verified sitemap URLs', () => {
  const notFound = readOutput('404.html');
  const robots = readOutput('robots.txt');

  assert.match(notFound, /<meta name="robots" content="noindex, nofollow"/);
  assert.equal(robots, 'User-agent: *\nAllow: /\n');
});

test('public HTML excludes placeholders, unsupported claims, and viewer scripts', () => {
  const output = htmlFiles()
    .map((file) => readFileSync(file, 'utf8'))
    .join('\n');

  assert.doesNotMatch(output, /TODO|TODO-your-domain\.example/i);
  assert.doesNotMatch(output, /five[- ]seed/i);
  assert.doesNotMatch(output, /country-capital|present-past/);
  assert.doesNotMatch(output, /<script\b/i);
  assert.match(output, /Viewer held for validation/);
  assert.match(output, /tool-selection/);
  assert.match(output, /run artifact/);
  assert.doesNotMatch(output, /fv-task|Reveal correct answers/i);
});

test('root-relative links and assets resolve inside dist', () => {
  for (const file of htmlFiles()) {
    const html = readFileSync(file, 'utf8');
    const attributes = html.matchAll(/(?:href|src)="([^"]+)"/g);

    for (const [, value] of attributes) {
      if (!value.startsWith('/') || value.startsWith('//')) continue;

      const pathname = value.split(/[?#]/, 1)[0];
      const relative = pathname.replace(/^\/+/, '');
      const target = relative.endsWith('/')
        ? join(dist, relative, 'index.html')
        : join(dist, relative);
      const fallback = join(dist, relative, 'index.html');

      assert.ok(existsSync(target) || existsSync(fallback), `${value} in ${file} does not resolve`);
    }
  }
});

test('social card is a 1200 by 630 PNG', () => {
  const image = readFileSync(join(dist, 'social-card.png'));

  assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(image.readUInt32BE(16), 1200);
  assert.equal(image.readUInt32BE(20), 630);
});
