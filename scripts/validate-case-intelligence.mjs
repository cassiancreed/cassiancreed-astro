#!/usr/bin/env node

import { readFile } from 'node:fs/promises';

const intelligenceUrl = new URL('../src/data/case-intelligence.json', import.meta.url);
const calendarUrl = new URL('../src/data/court-calendar.tsv', import.meta.url);
const errors = [];
const isUrl = (value) => {
  try { return ['http:', 'https:'].includes(new URL(value).protocol); }
  catch { return false; }
};

const intelligence = JSON.parse(await readFile(intelligenceUrl, 'utf8'));
const calendarLines = (await readFile(calendarUrl, 'utf8')).trim().split(/\r?\n/);
const calendarIds = new Set(calendarLines.slice(1).map((line) => line.split('\t')[1]).filter(Boolean));

if (intelligence.schema_version !== '1.0') errors.push('schema_version must be 1.0.');
if (Number.isNaN(Date.parse(intelligence.updated_at))) errors.push('updated_at must be an ISO date-time.');

for (const [eventId, score] of Object.entries(intelligence.display_priority_by_event ?? {})) {
  if (!calendarIds.has(eventId)) errors.push(`display priority references unknown calendar id "${eventId}".`);
  if (!Number.isInteger(score) || score < 0 || score > 100) errors.push(`display priority for "${eventId}" must be an integer from 0 to 100.`);
}

const caseKeys = new Set();
for (const record of intelligence.cases ?? []) {
  const label = record.case_key || '(missing case_key)';
  if (!record.case_key || !record.case_name) errors.push(`${label}: case_key and case_name are required.`);
  if (caseKeys.has(record.case_key)) errors.push(`${label}: duplicate case_key.`);
  caseKeys.add(record.case_key);
  if (Number.isNaN(Date.parse(record.research_cutoff))) errors.push(`${label}: research_cutoff must be an ISO date-time.`);

  for (const eventId of record.calendar_event_ids ?? []) {
    if (!calendarIds.has(eventId)) errors.push(`${label}: unknown calendar_event_id "${eventId}".`);
  }

  for (const signal of record.predictive_signals ?? []) {
    if (!signal.type || Number.isNaN(Date.parse(signal.starts_at))) errors.push(`${label}: every predictive signal needs type and starts_at.`);
    if (!isUrl(signal.source_url)) errors.push(`${label}: predictive signal source_url must be HTTP(S).`);
  }

  const seoQueries = new Set();
  for (const item of record.discovery?.seo_long_tail ?? []) {
    const normalized = item.query?.trim().toLowerCase();
    if (!normalized || !item.intent || !Number.isInteger(item.priority)) errors.push(`${label}: every SEO term needs query, intent and integer priority.`);
    if (seoQueries.has(normalized)) errors.push(`${label}: duplicate SEO query "${item.query}".`);
    seoQueries.add(normalized);
  }

  for (const item of record.discovery?.paa_observed ?? []) {
    if (!item.question || Number.isNaN(Date.parse(item.observed_at)) || !isUrl(item.source_url)) {
      errors.push(`${label}: observed PAA requires question, observed_at and source_url; otherwise store it as a candidate.`);
    }
  }

  for (const field of ['paa_candidates', 'ai_search_prompts']) {
    const values = record.discovery?.[field] ?? [];
    if (values.some((value) => typeof value !== 'string' || !value.trim())) errors.push(`${label}: ${field} must contain non-empty strings.`);
    if (new Set(values.map((value) => value.trim().toLowerCase())).size !== values.length) errors.push(`${label}: ${field} contains duplicates.`);
  }
}

if (errors.length) {
  console.error(`Case intelligence failed validation (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Case intelligence passed: ${caseKeys.size} reusable case record(s), ${Object.keys(intelligence.display_priority_by_event).length} calendar priority link(s).`);
