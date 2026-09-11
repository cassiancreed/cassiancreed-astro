#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { parseCourtCalendar } from '../src/data/court-calendar-parser.mjs';

const caseKey = process.argv[2];
if (!caseKey) {
  console.error('Usage: npm run case:packet -- <case-key>');
  process.exit(1);
}

const intelligence = JSON.parse(await readFile(new URL('../src/data/case-intelligence.json', import.meta.url), 'utf8'));
const record = intelligence.cases.find((item) => item.case_key === caseKey);
if (!record) {
  console.error(`Unknown case key: ${caseKey}`);
  process.exit(1);
}

const parsed = parseCourtCalendar(await readFile(new URL('../src/data/court-calendar.tsv', import.meta.url), 'utf8'));
const calendarRows = [...parsed.entries, ...parsed.unconfirmed, ...parsed.appeals, ...parsed.investigations, ...parsed.completed];
const linkedEvents = calendarRows.filter((item) => record.calendar_event_ids.includes(item.id));

const packet = {
  generated_at: new Date().toISOString(),
  factual_cutoff: record.research_cutoff,
  case: record,
  court_calendar: linkedEvents,
  reuse_rule: 'Use this canonical packet for website, newsletter, NotebookLM, YouTube, TikTok, Spotify and social. Refresh source facts once, then regenerate only affected downstream fields.',
};

console.log(JSON.stringify(packet, null, 2));
