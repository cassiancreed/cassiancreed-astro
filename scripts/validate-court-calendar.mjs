import fs from 'node:fs';
import { parseCourtCalendar } from '../src/data/court-calendar-parser.mjs';

const file = new URL('../src/data/court-calendar.tsv', import.meta.url);
const data = parseCourtCalendar(fs.readFileSync(file, 'utf8'));

// A scheduled row whose date has passed and which is not marked ongoing stops
// rendering, so it disappears from the page while still sitting in the file
// claiming a proceeding is coming. That is the one failure mode a reader never
// sees. Report it every build, by name, so it gets moved instead of forgotten.
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(new Date());
const stale = data.entries.filter((row) => row.ongoing !== true && row.dateISO < today);
if (stale.length) {
  console.warn(
    `\nATTENTION: ${stale.length} scheduled ${stale.length === 1 ? 'entry has' : 'entries have'} a date in the past and ${stale.length === 1 ? 'is' : 'are'} not marked ongoing, so ${stale.length === 1 ? 'it is' : 'they are'} no longer visible on the page:\n` +
    stale.map((row) => `  - ${row.id} (${row.case}) — ${row.dateISO}`).join('\n') +
    `\nMove each one forward with a sourced date, mark it ongoing while it is actually running, or move it to unconfirmed or completed.\n`,
  );
}

console.log(
  `Court calendar valid: ${data.entries.length} scheduled, ` +
  `${data.unconfirmed.length} unconfirmed, ${data.appeals.length} awaiting decision, ` +
  `${data.investigations.length} investigations, ${data.completed.length} completed.`,
);
