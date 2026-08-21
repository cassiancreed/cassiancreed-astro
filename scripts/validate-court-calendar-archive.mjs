import fs from 'node:fs';
import { parseCourtCalendar } from '../src/data/court-calendar-parser.mjs';

// The archive is held to the live calendar's rules plus two of its own: an
// archived matter must be concluded, and it must exist in exactly one file. A
// row that appears in both places is the duplicate-rendering problem again, one
// file removed, and the two copies will drift.
const liveFile = new URL('../src/data/court-calendar.tsv', import.meta.url);
const archiveFile = new URL('../src/data/court-calendar-archive.tsv', import.meta.url);

const live = parseCourtCalendar(fs.readFileSync(liveFile, 'utf8'));
const archiveRaw = fs.readFileSync(archiveFile, 'utf8');
const archive = parseCourtCalendar(archiveRaw);

const failures = [];

const liveIds = new Set(
  [...live.entries, ...live.unconfirmed, ...live.appeals, ...live.investigations, ...live.completed]
    .map((row) => row.id),
);

const sections = ['entries', 'unconfirmed', 'appeals', 'investigations'];
for (const section of sections) {
  for (const row of archive[section]) {
    failures.push(`${row.id}: archived rows must use section "completed", found "${section}"`);
  }
}

const seen = new Set();
for (const row of archive.completed) {
  if (liveIds.has(row.id)) failures.push(`${row.id}: appears in both the live calendar and the archive`);
  if (seen.has(row.id)) failures.push(`${row.id}: duplicated inside the archive`);
  seen.add(row.id);
  if (!row.src || !row.srcLabel) failures.push(`${row.id}: archived without its original source`);
  if (!row.verified) failures.push(`${row.id}: archived without a last-verified date`);
}

if (failures.length) {
  console.error(`Court calendar archive invalid (${failures.length}):\n${failures.join('\n')}`);
  process.exit(1);
}

console.log(`Court calendar archive valid: ${archive.completed.length} archived matters, no overlap with the live calendar.`);
