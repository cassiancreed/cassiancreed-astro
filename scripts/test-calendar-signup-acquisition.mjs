import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calendarSignupUrl } from '../src/scripts/calendar-signup-acquisition.mjs';
const base = 'https://subscribe-forms.beehiiv.com/v3/forms/4d7c7c61-f04c-4870-bf20-f1af8a540e0f?utm_source=website&utm_medium=calendar_alert&utm_campaign=court_calendar_updates';
test('TWIC acquisition survives the Court dialog hop while preserving exact provider form', () => {
 const url = new URL(calendarSignupUrl(base, {s:'twic',m:'article',c:'twic_2026_09_28_10_04',u:'closing_calendar'}));
 assert.equal(url.origin + url.pathname, base.split('?')[0]);
 assert.deepEqual(Object.fromEntries(url.searchParams), {utm_source:'twic',utm_medium:'article',utm_campaign:'twic_2026_09_28_10_04',utm_content:'closing_calendar'});
});
test('direct visit preserves existing Court attribution', () => {
 assert.equal(calendarSignupUrl(base, null), base);
 assert.equal(calendarSignupUrl(base, {}), base);
});
test('missing incoming fields do not retain invented conversion-hop campaign', () => {
 const url = new URL(calendarSignupUrl(base, {s:'newsletter'}));
 assert.equal(url.searchParams.get('utm_source'),'newsletter');
 assert.equal(url.searchParams.has('utm_campaign'),false);
 assert.equal(url.searchParams.has('utm_medium'),false);
});
test('form iframe and fallback share forwarded URL; offer metadata retained', () => {
 const component = readFileSync(new URL('../src/components/HomeCourtCalendar.astro', import.meta.url),'utf8');
 assert.match(component,/alertForm\.src = formUrl;/);
 assert.match(component,/alertFallback\.href = formUrl;/);
 assert.match(component,/data-nep-offer-id="court_calendar_updates"/);
});
