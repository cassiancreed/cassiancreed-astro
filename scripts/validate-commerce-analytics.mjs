import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = path.resolve('src');
const distRoot = path.resolve('dist');
const failures = [];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory)) {
    const absolute = path.join(directory, entry);
    (await stat(absolute)).isDirectory()
      ? files.push(...await walk(absolute))
      : files.push(absolute);
  }
  return files;
}

const sourceFiles = (await walk(sourceRoot)).filter((file) => /\.(?:astro|[cm]?[jt]sx?)$/.test(file));
const sourceText = (await Promise.all(sourceFiles.map((file) => readFile(file, 'utf8')))).join('\n');

const beginCheckoutReferences = sourceText.match(/\bbegin_checkout\b/g) ?? [];
if (beginCheckoutReferences.length) {
  failures.push(`expected no begin_checkout references in production source, found ${beginCheckoutReferences.length}`);
}

const buyClickWriters = sourceText.match(/gtag\s*\(\s*['"]event['"]\s*,\s*['"]buy_cta_click['"]/g) ?? [];
if (buyClickWriters.length !== 1) {
  failures.push(`expected exactly one GA4 buy_cta_click writer, found ${buyClickWriters.length}`);
}

const baseSource = await readFile(path.join(sourceRoot, 'layouts', 'Base.astro'), 'utf8');
for (const required of [
  "a.href.includes('cassiancreed.beehiiv.com/products/')",
  'link_url:a.href',
  'page_path:location.pathname',
  "book_key:a.dataset.bookKey||'(not_set)'",
  "cta_placement:a.dataset.ctaPlacement||'(not_set)'",
]) {
  if (!baseSource.includes(required)) failures.push(`Base.astro product-click contract missing: ${required}`);
}

const htmlFiles = (await walk(distRoot)).filter((file) => file.endsWith('.html'));
const productAnchors = [];

for (const file of htmlFiles) {
  const html = await readFile(file, 'utf8');
  const route = path.relative(distRoot, file).replace(/\\/g, '/').replace(/index\.html$/, '');
  const renderedRoute = route ? `/${route}` : '/';
  const anchors = [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"[^>]*>/gi)];

  for (const match of anchors) {
    const href = match[1].replace(/&amp;/g, '&');
    let url;
    try {
      url = new URL(href);
    } catch {
      continue;
    }
    if (url.hostname !== 'cassiancreed.beehiiv.com' || !url.pathname.startsWith('/products/')) continue;
    productAnchors.push({ route: renderedRoute, href });
    if (!html.includes("gtag('event','buy_cta_click'")) {
      failures.push(`${renderedRoute}: Beehiiv product anchor is missing the generic buy_cta_click handler`);
    }
    if (html.includes("gtag('event','begin_checkout'")) {
      failures.push(`${renderedRoute}: Beehiiv product anchor still ships a generic begin_checkout writer`);
    }
  }
}

if (!productAnchors.length) failures.push('expected at least one rendered Beehiiv product anchor');

if (failures.length) {
  console.error(`Commerce analytics invalid:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

const routes = new Set(productAnchors.map(({ route }) => route));
console.log(
  `Commerce analytics valid: ${productAnchors.length} rendered Beehiiv product anchors across ${routes.size} routes; ` +
  'one buy_cta_click writer; zero generic begin_checkout writers.',
);
