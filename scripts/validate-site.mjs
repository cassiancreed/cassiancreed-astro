import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const failures = [];
const postDateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
});

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir)) {
    const full = path.join(dir, entry);
    (await stat(full)).isDirectory() ? out.push(...await walk(full)) : out.push(full);
  }
  return out;
}

const decode = (s = '') => s
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&mdash;/g, '—').replace(/&ndash;/g, '–').replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/<[^>]+>/g, '').trim();

const htmlFiles = (await walk(root)).filter(f => f.endsWith('.html'));
const routes = new Map();
for (const file of htmlFiles) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const route = rel === 'index.html' ? '/' : `/${rel.replace(/index\.html$/, '')}`;
  routes.set(route, file);
}

const redirects = new Set();
if (existsSync('public/_redirects')) {
  for (const line of (await readFile('public/_redirects', 'utf8')).split('\n')) {
    const [from] = line.trim().split(/\s+/);
    if (from?.startsWith('/')) redirects.add(from.replace(/\*$/, ''));
  }
}

for (const [route, file] of routes) {
  const html = await readFile(file, 'utf8');
  const title = decode(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]);
  const description = decode(html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]);
  if (!title || title.length > 60) failures.push(`${route}: title length ${title.length}`);
  if (route !== '/410.html' && (!description || description.length > 160)) failures.push(`${route}: description length ${description.length}`);
  const h1s = [...html.matchAll(/<h1\b/gi)].length;
  if (route !== '/410.html' && h1s !== 1) failures.push(`${route}: expected one h1, found ${h1s}`);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
  const duplicateIds = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
  if (duplicateIds.length) failures.push(`${route}: duplicate ids ${duplicateIds.join(', ')}`);
  for (const img of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/\salt="[^"]*"/i.test(img[0])) failures.push(`${route}: image missing alt`);
  }
  for (const match of html.matchAll(/href="(\/[^"]*)"/g)) {
    const raw = match[1];
    if (raw.startsWith('//')) continue;
    const [withoutHash, anchor] = raw.split('#');
    const clean = (withoutHash.split('?')[0] || route);
    const normalized = clean.endsWith('/') ? clean : `${clean}/`;
    const targetFile = routes.get(normalized) || routes.get(clean);
    const isAsset = existsSync(path.join(root, clean.replace(/^\//, '')));
    const isRedirect = [...redirects].some(prefix => clean.startsWith(prefix));
    if (!targetFile && !isAsset && !isRedirect) failures.push(`${route}: broken internal link ${raw}`);
    if (anchor && targetFile) {
      const target = targetFile === file ? html : await readFile(targetFile, 'utf8');
      if (!target.includes(`id="${anchor}"`)) failures.push(`${route}: missing anchor ${raw}`);
    }
  }
  for (const phrase of ['ESTABLISHED FACT', 'PROSECUTION ALLEGATION', 'DEFENSE ARGUMENT', 'within a minute']) {
    if (html.includes(phrase)) failures.push(`${route}: forbidden public phrase “${phrase}”`);
  }
  if (route.startsWith('/post/')) {
    const dateRow = html.match(/<p\s+class="post__dates"[^>]*>([\s\S]*?)<\/p>/i)?.[1];
    if (!dateRow) failures.push(`${route}: post date row missing`);
    const times = [...(dateRow?.matchAll(/<time\s+datetime="(\d{4}-\d{2}-\d{2})"[^>]*>([\s\S]*?)<\/time>/gi) ?? [])];
    if (dateRow && times.length === 0) failures.push(`${route}: post date time element missing`);
    for (const time of times) {
      const [, datetime, visible] = time;
      const label = decode(visible);
      const prefix = label.match(/^(Published|Updated)\s+/)?.[1];
      const expected = prefix && `${prefix} ${postDateFormatter.format(new Date(`${datetime}T00:00:00.000Z`))}`;
      if (!expected || label !== expected) failures.push(`${route}: post date mismatch (${label} != ${expected ?? datetime})`);
    }
  }
}

if (!existsSync(path.join(root, 'favicon.svg'))) failures.push('favicon.svg missing');
if (failures.length) {
  console.error(`Site validation failed (${failures.length}):\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`Site validation passed: ${htmlFiles.length} HTML pages; titles, descriptions, H1s, image alts, IDs, links, anchors, post dates, and policy phrases checked.`);
