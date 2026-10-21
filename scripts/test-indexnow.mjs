import test from 'node:test';
import assert from 'node:assert/strict';
import { pickUrls } from '../netlify/functions/deploy-succeeded.mjs';

const xml = '<urlset>' +
  '<url><loc>https://cassiancreed.com/post/new-one/</loc><lastmod>2026-10-21</lastmod></url>' +
  '<url><loc>https://cassiancreed.com/post/old-one/</loc><lastmod>2026-01-02</lastmod></url>' +
  '<url><loc>https://cassiancreed.com/no-date/</loc></url>' +
  '<url><loc>https://evil.example.com/x/</loc><lastmod>2026-10-21</lastmod></url>' +
  '</urlset>';

test('IndexNow picks the hot pages plus recently changed pages on our host only', () => {
  const urls = pickUrls(xml, new Date('2026-10-21T12:00:00Z'));
  assert.ok(urls.includes('https://cassiancreed.com/court-calendar/'));
  assert.ok(urls.includes('https://cassiancreed.com/missing-persons/'));
  assert.ok(urls.includes('https://cassiancreed.com/post/new-one/'));
  assert.ok(!urls.includes('https://cassiancreed.com/post/old-one/'));
  assert.ok(!urls.includes('https://cassiancreed.com/no-date/'));
  assert.ok(!urls.some((u) => u.includes('evil.example.com')));
});
