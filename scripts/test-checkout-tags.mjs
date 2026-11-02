// Checkout tag check. Runs in site:check, after the build.
// Every buy.stripe.com link on the built site must carry client_reference_id,
// so a checkout shows which page and button it came from.
// Tag shape: site-<page-slug>-<slot>. Lowercase a-z, 0-9 and hyphens only,
// 40 characters at most. A tag never holds a person's name (the child-name
// guard also reads these tags as tracking tags).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const TEXT_FILE = /\.(html|xml|txt|json|js|mjs|css)$/i;
const STRIPE_LINK = /https?:\/\/buy\.stripe\.com\/[^\s"'<>)\\]*/gi;
const TAG_SHAPE = /^site(-[a-z0-9]+)+$/;
const MAX_TAG = 40;

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (TEXT_FILE.test(name)) out.push(full);
  }
  return out;
}

// dist/creators/index.html -> "creators"; dist/index.html -> "home"
export function pageSlug(relPath) {
  const parts = relPath.split(sep).join('/').replace(/\.html$/i, '').split('/');
  if (parts[parts.length - 1] === 'index') parts.pop();
  const slug = parts.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'home';
}

// Returns a list of plain-words problems for one file's text.
export function stripeLinkProblems(text, relPath) {
  const problems = [];
  let count = 0;
  for (const match of text.matchAll(STRIPE_LINK)) {
    count += 1;
    const raw = match[0].replace(/&amp;/g, '&');
    let tag = null;
    try {
      tag = new URL(raw).searchParams.get('client_reference_id');
    } catch {
      problems.push(`${relPath}: a Stripe link cannot be read`);
      continue;
    }
    if (!tag) {
      problems.push(`${relPath}: a Stripe link has no client_reference_id`);
      continue;
    }
    if (tag.length > MAX_TAG) problems.push(`${relPath}: a checkout tag is longer than ${MAX_TAG} characters`);
    if (!TAG_SHAPE.test(tag)) problems.push(`${relPath}: a checkout tag must be site- plus lowercase a-z, 0-9 and hyphens`);
    const prefix = `site-${pageSlug(relPath)}-`;
    if (prefix.length < MAX_TAG - 1 && TAG_SHAPE.test(tag) && !tag.startsWith(prefix)) {
      problems.push(`${relPath}: a checkout tag must start with ${prefix}`);
    }
  }
  return { count, problems };
}

test('self-test: the checker flags untagged, badly shaped and wrongly named tags', () => {
  const ok = stripeLinkProblems('<a href="https://buy.stripe.com/abc?client_reference_id=site-creators-join">x</a>', 'creators/index.html');
  assert.equal(ok.count, 1);
  assert.deepEqual(ok.problems, []);
  const escaped = stripeLinkProblems('<a href="https://buy.stripe.com/abc?utm=1&amp;client_reference_id=site-creators-note">x</a>', 'creators/index.html');
  assert.deepEqual(escaped.problems, []);
  assert.equal(stripeLinkProblems('<a href="https://buy.stripe.com/abc">x</a>', 'creators/index.html').problems.length, 1);
  assert.equal(stripeLinkProblems('<a href="https://buy.stripe.com/abc?client_reference_id=">x</a>', 'creators/index.html').problems.length, 1);
  assert.ok(stripeLinkProblems('<a href="https://buy.stripe.com/abc?client_reference_id=Site_Creators">x</a>', 'creators/index.html').problems.length >= 1);
  assert.ok(stripeLinkProblems('<a href="https://buy.stripe.com/abc?client_reference_id=site-other-join">x</a>', 'creators/index.html').problems.length === 1);
  const tooLong = 'site-creators-' + 'a'.repeat(40);
  assert.ok(stripeLinkProblems(`<a href="https://buy.stripe.com/abc?client_reference_id=${tooLong}">x</a>`, 'creators/index.html').problems.length >= 1);
  assert.equal(pageSlug('index.html'), 'home');
  assert.equal(pageSlug(['post', 'some-post', 'index.html'].join(sep)), 'post-some-post');
});

test('every buy.stripe.com link on the built site carries a valid client_reference_id', { skip: !existsSync(DIST) && 'dist/ is not built' }, () => {
  let total = 0;
  const problems = [];
  for (const file of walk(DIST)) {
    const rel = relative(DIST, file);
    const result = stripeLinkProblems(readFileSync(file, 'utf8'), rel);
    total += result.count;
    problems.push(...result.problems);
  }
  console.log(`Checkout tags: ${total} buy.stripe.com link(s) found in dist/, ${problems.length} problem(s).`);
  assert.deepEqual(problems, []);
});
