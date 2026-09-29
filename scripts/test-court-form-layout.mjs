import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const home = read('dist/index.html');
const calendar = read('dist/court-calendar/index.html');
const frames = html => [...html.matchAll(/<iframe\b[^>]*>/g)].map(match => match[0]);
const courtId = '4d7c7c61-f04c-4870-bf20-f1af8a540e0f';
test('both rendered Court embeds permit overflow and retain accessible titles', () => {
 for (const html of [home, calendar]) {
  const court = frames(html).filter(frame => frame.includes(courtId));
  assert.equal(court.length, 1);
  assert.match(court[0], /scrolling="auto"/);
  assert.match(court[0], /title="[^"]+"/);
 }
});
test('non-Court capture embeds keep their existing scrolling setting', () => {
 const others = frames(home).filter(frame => frame.includes('capture__embed') && !frame.includes(courtId));
 assert.ok(others.length);
 for (const frame of others) assert.match(frame, /scrolling="no"/);
});
test('only homepage has modal; both Court paths retain standalone fallbacks', () => {
 assert.match(home, /<dialog[^>]*aria-labelledby="calendar-alert-title"/);
 assert.match(home, /aria-label="Close court calendar updates form"/);
 assert.doesNotMatch(calendar, /<dialog[^>]*data-calendar-alert-dialog/);
 for (const html of [home, calendar]) assert.match(html, new RegExp('<a[^>]*href="https://subscribe-forms.beehiiv.com/v3/forms/' + courtId));
});
test('Court layout does not crop provider document; narrow-screen override stays scoped', () => {
 const component = read('src/components/CaptureBlock.astro');
 assert.match(component, /\.capture__embed-window--calendar\s*\{[^}]*height: auto;[^}]*overflow: visible;/);
 assert.match(component, /\.capture__embed-window--calendar \.capture__embed\s*\{[^}]*position: static;[^}]*left: auto;[^}]*width: 100%;/);
 assert.match(component, /@media \(max-width: 430px\)[\s\S]*\.capture__embed-window--calendar\s*\{\s*width: 100%;\s*margin-left: 0;/);
 const modal = read('src/components/HomeCourtCalendar.astro');
 assert.match(modal, /max-height:calc\(100dvh - 28px\);overflow:auto/);
 assert.match(modal, /\.case-alert__embed\{[^}]*position:static;[^}]*width:100%;height:clamp\(360px,60dvh,520px\)/);
 assert.doesNotMatch(modal, /\.case-alert__embed\{[^}]*top:-/);
});
