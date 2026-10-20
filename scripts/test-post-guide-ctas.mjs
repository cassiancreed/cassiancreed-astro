// NEP-20261019-GUIDE-BUTTONS: every free case explainer with a live paid guide
// shows the same button twice — once right after the main explainer (markdown
// block) and once at the bottom (GuideCTA.astro). Runs after astro build.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { POST_GUIDE_CTAS, postGuideCta, postGuideCtaHtml } from '../src/data/post-guide-ctas.mjs';
import { LIVE_PRODUCTS } from '../src/data/calendar-explainer-links.mjs';

const postDir = 'src/content/posts';
const sourceBySlug = new Map(readdirSync(postDir).filter((f) => /\.mdx?$/.test(f)).map((file) => {
  const text = readFileSync(`${postDir}/${file}`, 'utf8');
  const slug = text.match(/^slug:\s*["']?([^"'\r\n]+)/m)?.[1]?.trim() ?? file.replace(/\.mdx?$/, '');
  return [slug, text];
}));
const anchors = (html) => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
  attrs: m[1],
  body: m[2],
  href: m[1].match(/\bhref="([^"]*)"/)?.[1]?.replace(/&amp;|&#38;|&#x26;/g, '&'),
  placement: m[1].match(/\bdata-cta-placement="([^"]*)"/)?.[1],
}));
const text = (html) => html.replace(/<[^>]+>/g, '').replace(/&#39;|&#x27;/g, "'").replace(/&amp;|&#x26;/g, '&').trim();

test('every mapped post exists, is not archived, and points at a live priced product', () => {
  for (const [slug, config] of Object.entries(POST_GUIDE_CTAS)) {
    const source = sourceBySlug.get(slug);
    assert.ok(source, `missing post ${slug}`);
    assert.doesNotMatch(source, /^archived:\s*true/m, `${slug} is archived`);
    assert.ok(LIVE_PRODUCTS[config.product], `${slug}: ${config.product} is not in LIVE_PRODUCTS`);
    assert.notEqual(config.product, 'jury-chess', 'Jury Chess is a book, not a case guide');
    const cta = postGuideCta(slug, 'end');
    assert.equal(cta.label, `Get the ${LIVE_PRODUCTS[config.product].price} guide: ${LIVE_PRODUCTS[config.product].title} →`);
  }
});

test('each mapped post source carries the exact shared in-article block once', () => {
  for (const slug of Object.keys(POST_GUIDE_CTAS)) {
    const source = sourceBySlug.get(slug).replace(/\r\n/g, '\n');
    const block = postGuideCtaHtml(slug, 'end');
    assert.equal(source.split(block).length - 1, 1, `${slug}: in-article guide block missing or changed`);
  }
});

test('built pages show the guide button after the explainer and again at the bottom', () => {
  for (const slug of Object.keys(POST_GUIDE_CTAS)) {
    const html = readFileSync(`dist/post/${slug}/index.html`, 'utf8');
    const list = anchors(html);
    const skipBottom = POST_GUIDE_CTAS[slug].skipBottom === true;
    if (skipBottom) assert.equal(postGuideCta(slug, 'bottom'), null, `${slug}: bottom button must be skipped`);
    for (const placement of skipBottom ? ['end'] : ['end', 'bottom']) {
      const cta = postGuideCta(slug, placement);
      const matches = list.filter((a) => a.placement === cta.placement && a.href === cta.href);
      assert.equal(matches.length, 1, `${slug}: expected one ${placement} button`);
      assert.match(matches[0].attrs, /class="guide-btn"/);
      assert.match(matches[0].attrs, /data-book-key="[^"]+"/);
      assert.equal(text(matches[0].body.replace(/<span[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/span>/, '')), cta.label);
    }
    const product = LIVE_PRODUCTS[POST_GUIDE_CTAS[slug].product].url;
    if (skipBottom) {
      assert.ok(!html.includes(`${POST_GUIDE_CTAS[slug].key}_free_post_bottom`), `${slug}: bottom button must not render`);
      assert.ok(!html.includes('class="post-guide-cta"'), `${slug}: bottom box must not render`);
      assert.equal(list.filter((a) => a.href?.split('?')[0] === product).length, 1, `${slug}: only the in-article button`);
      continue;
    }
    const end = html.indexOf(postGuideCta(slug, 'end').placement + '"');
    const bottom = html.indexOf(postGuideCta(slug, 'bottom').placement + '"');
    assert.ok(end > 0 && bottom > end, `${slug}: in-article button must come before the bottom button`);
    assert.equal(list.filter((a) => a.href?.split('?')[0] === product).length, 2, `${slug}: no duplicate guide buttons`);
  }
});

test('the Karmelo Anthony post (juvenile case) carries no Jury Chess promotion', () => {
  const source = sourceBySlug.get('a-jury-convicted-a-family-still-grieves-karmelo-anthony-verdict-austin-metcalf');
  assert.doesNotMatch(source, /jury[ -]chess/i);
});

test('no guide button promises an updated file', () => {
  for (const slug of Object.keys(POST_GUIDE_CTAS)) {
    for (const placement of ['end', 'bottom']) {
      const cta = postGuideCta(slug, placement);
      if (cta) assert.doesNotMatch(cta.label, /update/i);
    }
  }
});
