import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  SITE, SEARCH_BOTS, EXCLUDED_PATHS, normalizePath, pageRoutes,
  readRedirectSources, isRedirected, sourceLastmod,
} from '../src/utils/search-index.mjs';

export const isNoindex = (html) => [...html.matchAll(/<meta\b[^>]*>/gi)].some(([tag]) =>
  /\bname=["'](?:robots|googlebot)["']/i.test(tag) && /\bcontent=["'][^"']*\bnoindex\b/i.test(tag));
export const sitemapEntries = (xml) => [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => ({
  url: entry.match(/<loc>([^<]+)<\/loc>/)?.[1],
  lastmod: entry.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
}));
function postSourceDate(source) {
  const text = readFileSync(source, 'utf8').split(/^---\s*$/m)[1] ?? '';
  return text.match(/^updatedDate:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1] ??
    text.match(/^pubDate:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
}
export async function validateSearchOutput(routes) {
  const failures = [];
  const xml = await readFile('dist/sitemap.xml', 'utf8');
  const entries = sitemapEntries(xml);
  const entryMap = new Map(entries.map((entry) => [new URL(entry.url).pathname, entry]));
  if (entries.length !== entryMap.size) failures.push('sitemap: duplicate URLs');
  const redirects = readRedirectSources();
  const sources = new Map(pageRoutes().map(({ route, source }) => [route, source]));
  for (const file of readdirSync('src/content/posts').filter((file) => /\.mdx?$/.test(file))) {
    const source = 'src/content/posts/' + file;
    const frontmatter = readFileSync(source, 'utf8').split(/^---\s*$/m)[1] ?? '';
    const slug = frontmatter.match(/^slug:\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim() ?? file.replace(/\.mdx?$/, '');
    sources.set('/post/' + slug + '/', source);
  }
  for (const [route, file] of routes) {
    const html = await readFile(file, 'utf8');
    const normalized = normalizePath(route);
    const excluded = isNoindex(html) || EXCLUDED_PATHS.has(normalized) || isRedirected(normalized, redirects);
    if (!excluded && !entryMap.has(normalized)) failures.push(route + ': indexable built page missing from sitemap');
    if (excluded && entryMap.has(normalized)) failures.push(route + ': excluded page in sitemap');
    if ([...html.matchAll(/<!--([\s\S]*?)-->/g)].some(([, comment]) => comment.includes('NEP-'))) {
      failures.push(route + ': internal task ID in HTML comment');
    }
    const source = sources.get(normalized);
    const expected = source ? source.startsWith('src/content/posts/')
      ? postSourceDate(source) : sourceLastmod(normalized, source) : undefined;
    const actual = entryMap.get(normalized);
    if (actual && expected && actual.lastmod !== expected) {
      failures.push(route + ': lastmod must equal source date ' + expected + ', found ' + actual.lastmod);
    }
    if (actual?.lastmod && !/^\d{4}-\d{2}-\d{2}$/.test(actual.lastmod)) failures.push(route + ': invalid lastmod');
  }
  for (const entry of entries) {
    const url = new URL(entry.url);
    if (url.origin !== SITE || !routes.has(url.pathname)) failures.push('sitemap: URL is not a built site page: ' + entry.url);
  }
  const llms = await readFile('dist/llms.txt', 'utf8');
  const linkedUrls = [...new Set(llms.match(/https?:\/\/[^\s)<>]+/g) ?? [])].map((url) => url.replace(/[.,;]+$/, ''));
  for (const value of linkedUrls) {
    const url = new URL(value);
    const file = routes.get(url.pathname);
    if (url.origin !== SITE || !file || !entryMap.has(url.pathname) || isNoindex(await readFile(file, 'utf8'))) {
      failures.push('llms.txt: URL is not a built indexable page: ' + value);
    }
  }
  const robots = await readFile('dist/robots.txt', 'utf8');
  if (/^\s*Disallow\s*:/mi.test(robots)) failures.push('robots.txt: Disallow is not permitted');
  for (const bot of SEARCH_BOTS) {
    if (!robots.split(/\r?\n/).includes('User-agent: ' + bot)) failures.push('robots.txt: missing ' + bot);
  }
  if (!robots.includes('Sitemap: ' + SITE + '/sitemap.xml')) failures.push('robots.txt: missing sitemap');

  const schemaRoutes = ['/', '/books/jury-chess/', '/court-calendar/', '/post/what-happens-at-d4vds-monday-hearing/', '/how-forensic-genetic-genealogy-works/'];
  for (const route of schemaRoutes) {
    const html = await readFile(routes.get(route), 'utf8');
    const nodes = [];
    try {
      for (const [, data] of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
        const parsed = JSON.parse(data);
        nodes.push(...(parsed['@graph'] ?? [parsed]));
      }
    } catch (error) { failures.push(route + ': invalid JSON-LD: ' + error.message); continue; }
    const organizations = nodes.filter((node) => node['@type'] === 'Organization');
    if (organizations.length !== 1 || organizations[0]['@id'] !== SITE + '/#org') failures.push(route + ': expected one #org Organization');
    if (route !== '/' && !nodes.some((node) => node['@type'] === 'BreadcrumbList')) failures.push(route + ': missing breadcrumbs');
    const article = nodes.find((node) => node['@type'] === 'Article');
    if (article && (article.author?.['@id'] !== SITE + '/#cassian-creed' || article.publisher?.['@id'] !== SITE + '/#org')) {
      failures.push(route + ': incorrect Article identity');
    }
    if (route.startsWith('/post/')) {
      const og = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/)?.[1];
      if (article?.image !== og) failures.push(route + ': Article image differs from og:image');
    }
  }
  for (const [route, file] of routes) {
    if (!route.startsWith('/post/')) continue;
    const html = await readFile(file, 'utf8');
    const image = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/)?.[1];
    if (!image) continue;
    const imageUrl = new URL(image);
    const imagePath = path.join('public', imageUrl.pathname);
    if (imageUrl.origin === SITE && existsSync(imagePath) && (await stat(imagePath)).size > 1_000_000) {
      failures.push(route + ': social image still exceeds 1 MB');
    }
  }
  console.log('Search validation: ' + entries.length + ' sitemap URLs; ' + linkedUrls.length + ' llms.txt links; schema identities and social images checked.');
  return failures;
}
