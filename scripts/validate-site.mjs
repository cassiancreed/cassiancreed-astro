import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('dist');
const failures = [];

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
}

const juryChessProductUrl = 'https://cassiancreed.beehiiv.com/products/jury-chess';
const expectedJuryChessCheckoutCtas = new Map([
  ['/', [
    `${juryChessProductUrl}?utm_source=website&utm_medium=homepage&utm_campaign=jury_chess`,
  ]],
  ['/books/', [
    `${juryChessProductUrl}?utm_source=cassiancreed.com&utm_medium=books_page_cross_sell&utm_campaign=clancy_to_jury_chess`,
    `${juryChessProductUrl}?utm_source=cassiancreed.com&utm_medium=books_page&utm_campaign=jury_chess`,
  ]],
  ['/post/anatomy-of-a-murder-trial-hernandez-melgar/', [
    `${juryChessProductUrl}?utm_source=website&utm_medium=book_cta&utm_campaign=melgar_cluster&utm_content=anatomy-of-a-murder-trial-hernandez-melgar_mid`,
    `${juryChessProductUrl}?utm_source=website&utm_medium=book_cta&utm_campaign=melgar_cluster&utm_content=anatomy-of-a-murder-trial-hernandez-melgar_end`,
  ]],
  ['/post/how-washington-courts-work-hernandez-melgar/', [
    `${juryChessProductUrl}?utm_source=website&utm_medium=book_cta&utm_campaign=melgar_cluster&utm_content=how-washington-courts-work-hernandez-melgar_mid`,
    `${juryChessProductUrl}?utm_source=website&utm_medium=book_cta&utm_campaign=melgar_cluster&utm_content=how-washington-courts-work-hernandez-melgar_end`,
  ]],
  ['/post/murder-staged-as-suicide-hernandez-melgar/', [
    `${juryChessProductUrl}?utm_source=website&utm_medium=book_cta&utm_campaign=melgar_cluster&utm_content=murder-staged-as-suicide-hernandez-melgar_mid`,
    `${juryChessProductUrl}?utm_source=website&utm_medium=book_cta&utm_campaign=melgar_cluster&utm_content=murder-staged-as-suicide-hernandez-melgar_end`,
  ]],
  ['/post/this-week-in-court-august-30-2026/', [
    `${juryChessProductUrl}?utm_source=website&utm_medium=book_cta&utm_campaign=twic_to_jury_chess&utm_content=this-week-in-court-august-30-2026_end`,
  ]],
]);

let juryChessCheckoutCtaCount = 0;
for (const [route, file] of routes) {
  const html = await readFile(file, 'utf8');
  const actual = [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/gi)]
    .map(match => match[1].replace(/&amp;/g, '&'))
    .filter(href => href.startsWith(juryChessProductUrl));
  const expected = expectedJuryChessCheckoutCtas.get(route) ?? [];
  juryChessCheckoutCtaCount += actual.length;
  if (actual.length !== expected.length || actual.some((href, index) => href !== expected[index])) {
    failures.push(`${route}: Jury Chess checkout CTAs do not match the attribution contract; expected ${JSON.stringify(expected)}, found ${JSON.stringify(actual)}`);
  }
}
if (juryChessCheckoutCtaCount !== 10) failures.push(`expected 10 Jury Chess checkout CTAs, found ${juryChessCheckoutCtaCount}`);

const beehiivProductUrlPrefix = 'https://cassiancreed.beehiiv.com/products/';
const expectedProductMetadata = new Map([
  ['/books/', [
    {
      href: 'https://cassiancreed.beehiiv.com/products/lindsay-clancy-trial-book?utm_source=cassiancreed.com&utm_medium=books_page&utm_campaign=lindsay_clancy_trial_book',
      bookKey: 'lindsay-clancy-trial-book',
      placement: 'books_page_primary',
    },
    {
      href: `${juryChessProductUrl}?utm_source=cassiancreed.com&utm_medium=books_page_cross_sell&utm_campaign=clancy_to_jury_chess`,
      bookKey: 'jury-chess',
      placement: 'books_page_cross_sell',
    },
    {
      href: `${juryChessProductUrl}?utm_source=cassiancreed.com&utm_medium=books_page&utm_campaign=jury_chess`,
      bookKey: 'jury-chess',
      placement: 'books_page_primary',
    },
    {
      href: 'https://cassiancreed.beehiiv.com/products/voir-dire-the-free-guide',
      bookKey: 'not_applicable',
      placement: 'books_page_free_guide',
    },
  ]],
  ['/court-calendar/', [
    {
      href: 'https://cassiancreed.beehiiv.com/products/case-chess-erin-patterson',
      bookKey: 'case-chess-erin-patterson',
      placement: 'court_calendar_case_guide',
    },
  ]],
  ['/international-court-watch/', [
    {
      href: 'https://cassiancreed.beehiiv.com/products/case-chess-erin-patterson',
      bookKey: 'case-chess-erin-patterson',
      placement: 'international_watch_case_guide',
    },
  ]],
]);

const attributesFromAnchor = (anchor) => Object.fromEntries(
  [...anchor.matchAll(/\b([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value.replace(/&amp;/g, '&')]),
);

let beehiivProductAnchorCount = 0;
let notApplicableBookKeyCount = 0;
for (const [route, file] of routes) {
  const html = await readFile(file, 'utf8');
  const productAnchors = [...html.matchAll(/<a\b[^>]*>/gi)]
    .map(([anchor]) => attributesFromAnchor(anchor))
    .filter(({ href = '' }) => href.startsWith(beehiivProductUrlPrefix));
  beehiivProductAnchorCount += productAnchors.length;

  for (const anchor of productAnchors) {
    const bookKey = anchor['data-book-key'];
    const placement = anchor['data-cta-placement'];
    if (!bookKey || bookKey === '(not_set)' || !placement || placement === '(not_set)') {
      failures.push(`${route}: Beehiiv product CTA is missing analytics metadata for ${anchor.href}`);
    }
    if (bookKey === 'not_applicable') {
      notApplicableBookKeyCount += 1;
      if (anchor.href !== 'https://cassiancreed.beehiiv.com/products/voir-dire-the-free-guide') {
        failures.push(`${route}: data-book-key="not_applicable" is reserved for the free Voir Dire guide`);
      }
    }
  }

  for (const expected of expectedProductMetadata.get(route) ?? []) {
    const matches = productAnchors.filter(({ href }) => href === expected.href);
    if (matches.length !== 1) {
      failures.push(`${route}: expected one product CTA for ${expected.href}, found ${matches.length}`);
      continue;
    }
    const [actual] = matches;
    if (actual['data-book-key'] !== expected.bookKey || actual['data-cta-placement'] !== expected.placement) {
      failures.push(`${route}: product CTA metadata mismatch for ${expected.href}; expected ${expected.bookKey}/${expected.placement}, found ${actual['data-book-key']}/${actual['data-cta-placement']}`);
    }
  }
}
if (beehiivProductAnchorCount !== 14) failures.push(`expected 14 Beehiiv product CTAs, found ${beehiivProductAnchorCount}`);
if (notApplicableBookKeyCount !== 1) failures.push(`expected one non-book Beehiiv product CTA, found ${notApplicableBookKeyCount}`);

if (!existsSync(path.join(root, 'favicon.svg'))) failures.push('favicon.svg missing');
if (failures.length) {
  console.error(`Site validation failed (${failures.length}):\n${failures.join('\n')}`);
  process.exit(1);
}
console.log(`Site validation passed: ${htmlFiles.length} HTML pages; titles, descriptions, H1s, image alts, IDs, links, anchors, and policy phrases checked.`);
