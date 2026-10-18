import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, relative } from 'node:path';
import { CONTENT_CATEGORIES } from '../data/content-categories.mjs';

export const SITE = 'https://cassiancreed.com';
export const EXCLUDED_PATHS = new Set([
  '/subscribed/', '/checklist/', '/jury-chess-sample/',
  '/international-court-watch/', '/410.html/',
]);
export const SEARCH_BOTS = [
  'Googlebot', 'Bingbot', 'Applebot', 'OAI-SearchBot', 'ChatGPT-User',
  'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User',
  'DuckAssistBot', 'GPTBot', 'ClaudeBot', 'Google-Extended',
  'Applebot-Extended', 'CCBot',
];

export function normalizePath(value) {
  const path = value.split(/[?#]/)[0];
  const clean = path.replace(/^\/+|\/+$/g, '');
  return clean ? '/' + clean + '/' : '/';
}
export function redirectSources(publicRules, toml) {
  const paths = publicRules.split(/\r?\n/)
    .map((line) => line.trim()).filter((line) => line && !line.startsWith('#'))
    .map((line) => line.split(/\s+/)[0]);
  for (const block of toml.split(/^\s*\[\[redirects\]\]\s*$/m).slice(1)) {
    const from = block.match(/^\s*from\s*=\s*["']([^"']+)["']/m)?.[1];
    if (from) paths.push(from);
  }
  // Host canonicalization rules for www do not redirect the apex site's routes.
  return [...new Set(paths.filter((path) => path.startsWith('/') && !path.startsWith('//')))];
}
export function readRedirectSources() {
  return redirectSources(readFileSync('public/_redirects', 'utf8'), readFileSync('netlify.toml', 'utf8'));
}
export function isRedirected(route, sources = readRedirectSources()) {
  const path = normalizePath(route);
  return sources.some((source) => {
    const pattern = normalizePath(source).split('*').map((part) =>
      part.split(/(:[A-Za-z_]\w*)/).map((segment) => segment.startsWith(':')
        ? '[^/]+' : segment.replace(/[.*+?^$()|[\]\\]/g, '\\$&')).join('')
    ).join('.*');
    return new RegExp('^' + pattern + '$').test(path);
  });
}
const gitDates = new Map();
export function gitLastmod(source) {
  if (gitDates.has(source)) return gitDates.get(source);
  let date;
  try {
    const options = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] };
    const [commit, value] = execFileSync('git',
      ['log', '-1', '--format=%H %cs', '--', ':(literal)' + source], options).trim().split(/\s+/);
    const shallowFile = execFileSync('git', ['rev-parse', '--git-path', 'shallow'], options).trim();
    const boundary = existsSync(shallowFile) && readFileSync(shallowFile, 'utf8').split(/\r?\n/).includes(commit);
    // A shallow boundary makes every surviving file look newly introduced.
    // Its real change date is unknown; never substitute the checkout's date.
    if (!boundary && /^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) date = value;
  } catch { /* Source dates are omitted when Git history is unavailable. */ }
  gitDates.set(source, date);
  return date;
}
export function tsvLastmod(source) {
  const row = readFileSync(source, 'utf8').split(/\r?\n/).find((line) =>
    line.startsWith('meta\tlast_updated\t'));
  return row?.split('\t').slice(2).find((value) => /^\d{4}-\d{2}-\d{2}$/.test(value));
}
export function sourceLastmod(route, source) {
  const dataFiles = {
    '/court-calendar/': 'src/data/court-calendar.tsv',
    '/court-calendar/archive/': 'src/data/court-calendar-archive.tsv',
    '/missing-persons/': 'src/data/missing-persons.tsv',
  };
  return dataFiles[normalizePath(route)] ? tsvLastmod(dataFiles[normalizePath(route)]) : gitLastmod(source);
}
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
export function pageRoutes() {
  const root = resolve('src/pages');
  const result = walk(root).filter((file) => file.endsWith('.astro') && !file.includes('['))
    .map((file) => {
      const source = relative(process.cwd(), file).replace(/\\/g, '/');
      const route = normalizePath(relative(root, file).replace(/\\/g, '/').replace(/\.astro$/, '').replace(/(^|\/)index$/, ''));
      const content = readFileSync(file, 'utf8');
      const baseTag = content.match(/<Base\b[\s\S]*?>/)?.[0] ?? '';
      const noindex = /\bnoindex(?:\s|=|>)/.test(baseTag);
      return { route, source, noindex };
    });
  result.push(...CONTENT_CATEGORIES.map(({ category }) => ({
    route: '/' + category + '/', source: 'src/pages/[category].astro', noindex: false,
  })));
  return result;
}
export function indexablePageRoutes() {
  const redirects = readRedirectSources();
  return pageRoutes().filter(({ route, noindex }) =>
    !noindex && !EXCLUDED_PATHS.has(route) && !isRedirected(route, redirects));
}
export function xml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
