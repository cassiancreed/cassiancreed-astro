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
