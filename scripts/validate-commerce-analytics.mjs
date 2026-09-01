import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const sourceRoot = path.resolve('src');
const distRoot = path.resolve('dist');
const failures = [];
const handlerStartMarker = '// Beehiiv product outbound tracking.';
const handlerEndMarker = '// GA4 sign_up';

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

function extractProductClickHandler(text, label) {
  const start = text.indexOf(handlerStartMarker);
  const end = start === -1 ? -1 : text.indexOf(handlerEndMarker, start);
  if (start === -1 || end === -1) {
    failures.push(`${label}: could not isolate the generic Beehiiv product-click handler`);
    return '';
  }
  return text.slice(start, end);
}

const buyClickWriters = sourceText.match(/gtag\s*\(\s*['"]event['"]\s*,\s*['"]buy_cta_click['"]/g) ?? [];
if (buyClickWriters.length !== 1) {
  failures.push(`expected exactly one GA4 buy_cta_click writer, found ${buyClickWriters.length}`);
}

const baseSource = await readFile(path.join(sourceRoot, 'layouts', 'Base.astro'), 'utf8');
const productClickHandler = extractProductClickHandler(baseSource, 'Base.astro');
if (/\bbegin_checkout\b/.test(productClickHandler)) {
  failures.push('Base.astro: generic Beehiiv product-click handler must not emit begin_checkout');
}

for (const required of [
  "a.href.includes('cassiancreed.beehiiv.com/products/')",
  'link_url:a.href',
  'page_path:location.pathname',
  "book_key:a.dataset.bookKey||'(not_set)'",
  "cta_placement:a.dataset.ctaPlacement||'(not_set)'",
]) {
  if (!baseSource.includes(required)) failures.push(`Base.astro product-click contract missing: ${required}`);
}

function installProductClickHandler(gtag) {
  const listeners = [];
  const document = {
    addEventListener(type, listener) {
      if (type === 'click') listeners.push(listener);
    },
  };
  const location = { pathname: '/dynamic-product-test/' };
  Function('document', 'gtag', 'location', productClickHandler)(document, gtag, location);
  if (listeners.length !== 1) {
    throw new Error(`expected one delegated click listener, found ${listeners.length}`);
  }
  return (target) => listeners[0]({ target });
}

function nestedTargetFor(anchor) {
  return {
    closest(selector) {
      if (selector !== 'a') throw new Error(`expected closest('a'), received ${selector}`);
      return anchor;
    },
  };
}

try {
  const calls = [];
  const dispatch = installProductClickHandler((...args) => calls.push(args));
  // Construct the anchor after listener registration to prove delegated handling
  // of links inserted by client-side components such as HomeCourtCalendar.
  const dynamicProductAnchor = {
    href: 'https://cassiancreed.beehiiv.com/products/jury-chess?utm_source=dynamic-test',
    dataset: { bookKey: 'jury-chess', ctaPlacement: 'dynamic-test' },
  };
  dispatch(nestedTargetFor(dynamicProductAnchor));

  const [eventType, eventName, parameters] = calls[0] ?? [];
  if (
    calls.length !== 1 ||
    eventType !== 'event' ||
    eventName !== 'buy_cta_click' ||
    parameters?.link_url !== dynamicProductAnchor.href ||
    parameters?.page_path !== '/dynamic-product-test/' ||
    parameters?.book_key !== 'jury-chess' ||
    parameters?.cta_placement !== 'dynamic-test'
  ) {
    failures.push('runtime harness: matching nested product click must emit exactly one complete buy_cta_click');
  }
  if (calls.some(([, name]) => name === 'begin_checkout')) {
    failures.push('runtime harness: matching product click must not emit begin_checkout');
  }

  dispatch(nestedTargetFor({
    href: 'https://cassiancreed.beehiiv.com/subscribe',
    dataset: {},
  }));
  if (calls.length !== 1) {
    failures.push('runtime harness: non-product Beehiiv click must not emit a commerce event');
  }

  const dispatchWithoutGtag = installProductClickHandler(undefined);
  const laterDynamicAnchor = {
    href: 'https://cassiancreed.beehiiv.com/products/lindsay-clancy',
    dataset: {},
  };
  dispatchWithoutGtag(nestedTargetFor(laterDynamicAnchor));
} catch (error) {
  failures.push(`runtime harness: ${error.message}`);
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
    const renderedHandler = extractProductClickHandler(html, renderedRoute);
    if (/\bbegin_checkout\b/.test(renderedHandler)) {
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
  'runtime delegated-click harness passed; one buy_cta_click writer; zero generic begin_checkout writers.',
);
