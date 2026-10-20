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
for (const [buildDate, expected] of [['2026-10-19', 'Next listed setting'], ['2026-10-20', 'Listed date'], ['2026-10-21', 'Listed date']]) {
  test(`future continuation stays non-occurrence-asserting at build date ${buildDate}`, async () => {
    const bhatt = ongoingRows.find(e => e.id === 'bhatt-jury-selection');
    assert.ok(bhatt);
    assert.equal(labelFor(bhatt, buildDate), expected);
    assert.equal(bhatt.dateISO, '2026-10-20');
    assert.match(bhatt.dateText, /October 20, 2026, 9:00 a.m. Eastern/);
    assert.doesNotMatch(labelFor(bhatt, buildDate), /began|completed|verdict/i);
    assert.equal(bhatt.ongoing, true);
  });
}
for (const id of ['farwell-jury-trial', 'faith-hedgepeth-trial']) {
  test(`historical ongoing sibling ${id} retains its explicit date text`, async () => {
    const entry = ongoingRows.find(e => e.id === id);
    assert.ok(entry);
    assert.equal(labelFor(entry, '2026-10-17'), 'Listed date');
    assert.match(entry.dateText, /Trial opened/);
    assert.doesNotMatch(labelFor(entry, '2026-10-17'), /began|completed|verdict/i);
    assert.equal(entry.ongoing, true);
  });
}
