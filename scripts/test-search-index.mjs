import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath, redirectSources, isRedirected, tsvLastmod, gitLastmod } from '../src/utils/search-index.mjs';
import { isNoindex, sitemapEntries, hasInternalTaskId } from './validate-search-output.mjs';

test('redirect exclusions use exact paths, wildcard boundaries and both configuration files', () => {
  const rules = redirectSources('/old /new 301\n/blog/* /case-files/ 301\nhttps://www.cassiancreed.com/* https://cassiancreed.com/:splat 301!',
    "[[redirects]]\nfrom = '/retired/'\nto = '/'\nstatus = 301\n");
  assert.equal(isRedirected('/old/', rules), true);
  assert.equal(isRedirected('/old-news/', rules), false);
  assert.equal(isRedirected('/blog/a/', rules), true);
  assert.equal(isRedirected('/retired/', rules), true);
  assert.equal(isRedirected('/books/', rules), false);
  assert.equal(normalizePath(''), '/');
  assert.equal(normalizePath('/books?utm_source=test#x'), '/books/');
});
test('noindex detection accepts attribute order and bot directives', () => {
  assert.equal(isNoindex('<meta content="noindex,follow" name="robots">'), true);
  assert.equal(isNoindex('<meta name="googlebot" content="noindex">'), true);
  assert.equal(isNoindex('<meta name="robots" content="index,follow">'), false);
});
test('sitemap parser and both TSV metadata layouts retain their source dates', async () => {
  assert.deepEqual(sitemapEntries('<url><loc>https://cassiancreed.com/</loc><lastmod>2026-06-01</lastmod></url>'),
    [{ url: 'https://cassiancreed.com/', lastmod: '2026-06-01' }]);
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const directory = mkdtempSync(join(tmpdir(), 'seo-tsv-date-'));
  const source = join(directory, 'calendar.tsv');
  try {
    for (const row of [
      ['meta', 'last_updated', '', '2020-01-02'],
      ['meta', 'last_updated', ...Array(11).fill(''), '2020-01-02'],
    ]) {
      writeFileSync(source, row.join('\t') + '\n');
      assert.equal(tsvLastmod(source), '2020-01-02');
    }
    writeFileSync(source, 'meta\tpage_title\t\tNo source date\n');
    assert.equal(tsvLastmod(source), undefined);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('Git dates use literal source paths and omit unknown shallow-history dates', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { pathToFileURL } = await import('node:url');
  const { execFileSync } = await import('node:child_process');
  const fixture = mkdtempSync(join(tmpdir(), 'seo-git-date-'));
  const originalDirectory = process.cwd();
  const repo = join(fixture, 'full'), shallow = join(fixture, 'shallow');
  const git = (args, cwd, date) => execFileSync('git', args, {
    cwd, stdio: 'pipe', env: { ...process.env,
      GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
      GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}),
    },
  });
  try {
    git(['init', '--quiet', repo], fixture);
    writeFileSync(join(repo, 'page[old].astro'), 'Old source');
    git(['add', '--all'], repo);
    git(['commit', '--quiet', '-m', 'Old page'], repo, '2010-01-02T03:04:05Z');
    writeFileSync(join(repo, 'other.txt'), 'Unrelated update');
    git(['add', '--all'], repo);
    git(['commit', '--quiet', '-m', 'Other update'], repo, '2015-01-02T03:04:05Z');
    process.chdir(repo);
    assert.equal(gitLastmod('page[old].astro'), '2010-01-02');
    git(['clone', '--quiet', '--depth', '1', pathToFileURL(repo).href, shallow], fixture);
    process.chdir(shallow);
    // Use the same source path in a different checkout to exercise cache identity too.
    assert.equal(gitLastmod('page[old].astro'), undefined);
  } finally {
    process.chdir(originalDirectory);
    rmSync(fixture, { recursive: true, force: true });
  }
});

test('task-ID guard covers HTML comments and inline script comments only', () => {
  assert.equal(hasInternalTaskId('<!-- NEP-ABC-1 -->'), true);
  assert.equal(hasInternalTaskId('<script>run(); // tracking (NEP-ABC-1)\n</script>'), true);
  assert.equal(hasInternalTaskId('<script is:inline>/* NEP-ABC-1 */ run();</script>'), true);
  assert.equal(hasInternalTaskId('<script>\n  /*\n   * multi-line NEP-ABC-1\n   */\n</script>'), true);
  assert.equal(hasInternalTaskId('<script>var s = "// NEP-ABC-1"; var u = \'https://x/*NEP-\';</script>'), false);
  assert.equal(hasInternalTaskId('<script>var r = /\\/\\/NEP-/g; var t = `/* NEP- */`;</script>'), false);
  assert.equal(hasInternalTaskId('<script>var half = total / 2; // fine\n</script>'), false);
  assert.equal(hasInternalTaskId('<script type="application/ld+json">{"a":"// NEP-ABC-1"}</script>'), false);
  assert.equal(hasInternalTaskId('<p>NEP-ABC-1 in visible text is not a comment</p>'), false);
});

test('metadata-only commits are skipped for Git lastmod', async () => {
  const { mkdtempSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const repo = mkdtempSync(join(tmpdir(), 'seo-git-ignore-'));
  const originalDirectory = process.cwd();
  const git = (args, date) => execFileSync('git', args, {
    cwd: repo, encoding: 'utf8', stdio: 'pipe', env: { ...process.env,
      GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
      GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
      ...(date ? { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date } : {}),
    },
  });
  const commit = (file, text, message, date) => {
    writeFileSync(join(repo, file), text);
    git(['add', '--all']); git(['commit', '--quiet', '-m', message], date);
    return git(['rev-parse', 'HEAD']).trim();
  };
  try {
    git(['init', '--quiet']);
    commit('a.astro', 'Content', 'Write page', '2011-01-01T00:00:00Z');
    commit('a.astro', 'Content + schema', 'Add schema\n\n[no-lastmod]', '2012-01-01T00:00:00Z');
    commit('b.astro', 'Content', 'Write page', '2013-01-01T00:00:00Z');
    const schemaOnly = commit('b.astro', 'Content + schema', 'Add schema', '2014-01-01T00:00:00Z');
    commit('c.astro', 'Schema only', 'Add schema [no-lastmod]', '2015-01-01T00:00:00Z');
    writeFileSync(join(repo, '.lastmod-ignore-revs'), '# metadata-only\n' + schemaOnly + '\n');
    process.chdir(repo);
    assert.equal(gitLastmod('a.astro'), '2011-01-01');
    assert.equal(gitLastmod('b.astro'), '2013-01-01');
    assert.equal(gitLastmod('c.astro'), undefined);
  } finally {
    process.chdir(originalDirectory);
    rmSync(repo, { recursive: true, force: true });
  }
});
