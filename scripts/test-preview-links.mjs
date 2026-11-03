import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {GUIDE_PREVIEWS, REMOVED_PREVIEWS} from '../src/data/calendar-explainer-links.mjs';

// Free guide previews are PDFs under public/previews/. Two rules, checked on the built site and on the sources:
//   1. A /previews/ link must land on a real PDF, or on an address public/_redirects sends
//      to a built page with a 301. A link to a missing file with no redirect fails.
//   2. A preview that was removed (see REMOVED_PREVIEWS) may not be linked, listed or shipped
//      again, and its old address must 301 to a built page, so nobody lands on a 404.
const files = (dir) => existsSync(dir)
  ? readdirSync(dir, {withFileTypes: true}).flatMap((e) => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name).replace(/\\/g, '/')])
  : [];
const TEXT = /\.(?:html|xml|txt|json|js|mjs|md|mdx|astro|ts|tsv)$/;
// Every "/previews/....pdf" path in a piece of text, with or without the host in front.
const previewPaths = (text) => [...text.matchAll(/(?:https?:\/\/(?:www\.)?cassiancreed\.com)?(\/previews\/[^\s"'<>)\\#?]+)/g)].map((m) => decodeURIComponent(m[1]));
const builtText = () => files('dist').filter((f) => TEXT.test(f));
// The 301 rules in public/_redirects: source address -> target.
const redirectRules = () => new Map((existsSync('public/_redirects') ? readFileSync('public/_redirects', 'utf8').split(/\r?\n/) : [])
  .map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).map((line) => line.split(/\s+/))
  .filter(([from, to, status]) => from && to && /^301!?$/.test(status || '')).map(([from, to]) => [from, to]));
const redirectLands = (rules, path) => {
  const to = rules.get(path);
  return Boolean(to) && to.startsWith('/') && existsSync(join('dist', to, 'index.html'));
};

test('the preview checker finds a removed or missing preview in text', () => {
  const html = '<a href="/previews/gone.pdf">x</a> <a href="https://cassiancreed.com/previews/here.pdf?x=1">y</a> <a href="https://news.example/story">z</a>';
  assert.deepEqual(previewPaths(html), ['/previews/gone.pdf', '/previews/here.pdf']);
  assert.deepEqual(previewPaths('no links here'), []);
});

test('a redirected address is accepted; a missing one is not', () => {
  const rules = new Map([['/previews/old.pdf', '/post/exists/']]);
  assert.equal(rules.get('/previews/old.pdf'), '/post/exists/');
  assert.equal(redirectLands(new Map(), '/previews/old.pdf'), false, 'no rule: a plain 404');
  assert.equal(redirectLands(new Map([['/previews/old.pdf', 'https://elsewhere.example/']]), '/previews/old.pdf'), false, 'a redirect must stay on the site');
  assert.equal(redirectLands(new Map([['/previews/old.pdf', '/post/never-built/']]), '/previews/old.pdf'), false, 'a redirect must land on a built page');
});

test('every /previews/ link in a built page or in the sources lands on a real PDF or a redirect', () => {
  const missing = [];
  const rules = redirectRules();
  let seen = 0;
  for (const file of builtText().filter((f) => f.startsWith('dist/') && f.endsWith('.html'))) {
    for (const path of previewPaths(readFileSync(file, 'utf8'))) {
      seen++;
      const target = join('public', path);
      const built = join('dist', path);
      const isPdf = existsSync(target) && existsSync(built) && statSync(built).size >= 1000 && readFileSync(built).subarray(0, 5).toString() === '%PDF-';
      if (!isPdf && !redirectLands(rules, path)) missing.push(file + ' -> ' + path);
    }
  }
  for (const file of files('src').filter((f) => TEXT.test(f))) {
    for (const path of previewPaths(readFileSync(file, 'utf8'))) {
      if (REMOVED_PREVIEWS.includes(path)) continue; // the removed list itself; checked below
      if (!existsSync(join('public', path)) && !redirectLands(rules, path)) missing.push(file + ' -> ' + path);
    }
  }
  assert.deepEqual(missing, [], 'a preview link has no file and no redirect behind it');
  assert.ok(seen >= 2, 'expected preview links in built pages; the checker may have broken');
  for (const url of Object.values(GUIDE_PREVIEWS)) assert.ok(existsSync(join('public', url)), 'GUIDE_PREVIEWS lists a missing file: ' + url);
});

test('a removed preview is not shipped, listed or linked anywhere', () => {
  assert.ok(REMOVED_PREVIEWS.length >= 1, 'the removed-preview list is empty');
  const rules = redirectRules();
  for (const path of REMOVED_PREVIEWS) {
    assert.ok(redirectLands(rules, path), path + ' needs a 301 in public/_redirects to a built page, so it is not a plain 404');
    assert.ok(!existsSync(join('public', path)), path + ' is still in public/');
    assert.ok(!existsSync(join('dist', path)), path + ' is still in dist/');
    assert.ok(!Object.values(GUIDE_PREVIEWS).includes(path), path + ' is still in GUIDE_PREVIEWS');
  }
  const linked = [];
  for (const file of builtText()) {
    for (const path of previewPaths(readFileSync(file, 'utf8'))) if (REMOVED_PREVIEWS.includes(path)) linked.push(file);
  }
  for (const file of files('src').filter((f) => TEXT.test(f) && f !== 'src/data/calendar-explainer-links.mjs')) {
    for (const path of previewPaths(readFileSync(file, 'utf8'))) if (REMOVED_PREVIEWS.includes(path)) linked.push(file);
  }
  assert.deepEqual([...new Set(linked)], [], 'a removed preview is still linked');
});
