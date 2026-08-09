import fs from 'node:fs';
import { parseCourtCalendar } from '../src/data/court-calendar-parser.mjs';

const file = new URL('../src/data/court-calendar.tsv', import.meta.url);
const data = parseCourtCalendar(fs.readFileSync(file, 'utf8'));
console.log(
  `Court calendar valid: ${data.entries.length} scheduled, ` +
  `${data.unconfirmed.length} unconfirmed, ${data.appeals.length} appeals, ` +
  `${data.completed.length} completed.`,
);
