import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { COLUMNS, parseCourtCalendar } from '../src/data/court-calendar-parser.mjs';
const original = fs.readFileSync(new URL('../src/data/court-calendar.tsv', import.meta.url), 'utf8');
function mutate(section, field, value) {
  const lines = original.trimEnd().split(/\r?\n/);
  const index = lines.findIndex(line => line.startsWith(`${section}\t`));
  const row = lines[index].split('\t');
  row[COLUMNS.indexOf(field)] = value;
  lines[index] = row.join('\t');
  return lines.join('\n');
}
test('current production calendar remains valid', () => assert.doesNotThrow(() => parseCourtCalendar(original)));
for (const date of ['2026-02-30', '2026-02-29', '2026-04-31', '2026-13-01', '2026-00-10', '2026-01-00', '2026-1-01']) {
  test(`reject impossible or malformed scheduled date ${date}`, () => assert.throws(() => parseCourtCalendar(mutate('scheduled', 'date_iso', date)), /real YYYY-MM-DD date/));
}
test('accept valid leap-day date', () => assert.doesNotThrow(() => parseCourtCalendar(mutate('scheduled', 'date_iso', '2028-02-29'))));
test('reject impossible completed event date', () => assert.throws(() => parseCourtCalendar(mutate('completed', 'date_iso', '2026-02-30')), /real YYYY-MM-DD date/));
test('reject impossible last-updated metadata', () => assert.throws(() => parseCourtCalendar(mutate('meta', 'status', '2026-02-30')), /real YYYY-MM-DD date/));

// Render the real ongoing-card date fragment with controlled dates. A scheduled
// continuation must never turn into a claim of commencement as the date passes.
const template = fs.readFileSync(new URL('../src/pages/court-calendar.astro', import.meta.url), 'utf8');
const ongoingFragment = template.match(/<p class="card__when"><span class="card__k">[^\n]+<\/p>/)?.[0];
assert.ok(ongoingFragment, 'actual ongoing-card date fragment exists');
const labelExpression = ongoingFragment.match(/<span class="card__k">\{([^}]+)\}<\/span>/)?.[1];
assert.ok(labelExpression, 'ongoing date label is sourced from the actual template');
// Execute source-owned wording, rather than a second copy of its date logic.
// The authoritative build separately verifies actual Astro HTML rendering.
const labelFor = new Function('e', 'BUILD_DATE', `return (${labelExpression});`);
const ongoingRows = parseCourtCalendar(original).entries.filter(e => e.ongoing === true);
const shiftDay = (iso, days) => new Date(Date.parse(`${iso}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
const monthDay = iso => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long', day: 'numeric' });
const ZONE_WORDS = {
  'America/New_York': /^(\(?Eastern\)?|ET|EDT|EST)\b/,
  'America/Chicago': /^(\(?Central\)?|CT|CDT|CST)\b/,
  'America/Denver': /^(\(?Mountain\)?|MT|MDT|MST)\b/,
  'America/Boise': /^(\(?Mountain\)?|MT|MDT|MST)\b/,
  'America/Los_Angeles': /^(\(?Pacific\)?|PT|PDT|PST)\b/,
};
// Fixed sample row: proves the label logic even on a day with no ongoing rows.
test('ongoing label logic: future date reads as next setting, never as an occurrence', () => {
  const sample = { dateISO: '2026-10-22', ongoing: true };
  assert.equal(labelFor(sample, '2026-10-21'), 'Next listed setting');
  assert.equal(labelFor(sample, '2026-10-22'), 'Listed date');
  assert.equal(labelFor(sample, '2026-10-23'), 'Listed date');
});
// Live rows: values are read from court-calendar.tsv, never pinned here, so a
// routine row refresh (new session date or time) does not break the build.
for (const entry of ongoingRows) {
  test(`ongoing row ${entry.id} keeps a consistent date, time and label`, () => {
    const day = entry.dateISO;
    for (const [buildDate, expected] of [[shiftDay(day, -1), 'Next listed setting'], [day, 'Listed date'], [shiftDay(day, 1), 'Listed date']]) {
      assert.equal(labelFor(entry, buildDate), expected, `${entry.id} at build date ${buildDate}`);
      assert.doesNotMatch(labelFor(entry, buildDate), /began|completed|verdict/i);
    }
    // The visible date text names the same day as the grid date.
    assert.ok(entry.dateText.includes(monthDay(day)) && entry.dateText.includes(day.slice(0, 4)), `${entry.id}: date text does not name ${day}`);
    // Any clock time uses the house format and names the row's own time zone.
    for (const match of entry.dateText.matchAll(/\b(\d{1,2}):(\d{2})\s*([ap])\.m\.\s*/g)) {
      assert.ok(Number(match[1]) >= 1 && Number(match[1]) <= 12 && Number(match[2]) <= 59, `${entry.id}: bad clock time ${match[0]}`);
      const zone = ZONE_WORDS[entry.timezone];
      assert.ok(zone, `${entry.id}: no zone words listed for ${entry.timezone}`);
      assert.match(entry.dateText.slice(match.index + match[0].length), zone, `${entry.id}: time ${match[0].trim()} must name its time zone`);
    }
    assert.equal(entry.ongoing, true);
  });
}
