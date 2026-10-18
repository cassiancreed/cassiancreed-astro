import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePath, redirectSources, isRedirected, tsvLastmod } from '../src/utils/search-index.mjs';
import { isNoindex, sitemapEntries } from './validate-search-output.mjs';

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
test('sitemap parser retains source dates and TSV dates are not build dates', () => {
  assert.deepEqual(sitemapEntries('<url><loc>https://cassiancreed.com/</loc><lastmod>2026-06-01</lastmod></url>'),
    [{ url: 'https://cassiancreed.com/', lastmod: '2026-06-01' }]);
  assert.equal(tsvLastmod('src/data/court-calendar-archive.tsv'), '2026-09-09');
});
