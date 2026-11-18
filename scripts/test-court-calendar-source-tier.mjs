import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { classifyCourtCalendarSources, OFFICIAL_SINGLE_LABEL, NEWS_SINGLE_LABEL } from '../src/data/court-calendar-source-tier.mjs';
import { COLUMNS, parseCourtCalendar } from '../src/data/court-calendar-parser.mjs';
import { parseInternationalWatch } from '../src/data/international-watch-parser.mjs';

const classify = (overrides) => classifyCourtCalendarSources(overrides);

test('one court docket is listed as 1 source, official', () => {
  const result = classify({
    sourceUrl: 'https://www.masscourts.org/eservices/home.page',
    sourceType: 'Primary — state court docket',
    sourceLabel: 'MassCourts docket',
  });
  assert.deepEqual(result, { tier: 'official-single', label: OFFICIAL_SINGLE_LABEL });
});

test('one prosecutor release is official even when the type says government source', () => {
  const result = classify({
    sourceUrl: 'https://www.firstda.co/example',
    sourceType: 'Primary — government source',
    sourceLabel: 'Official First Judicial District Attorney announcement',
  });
  assert.equal(result.tier, 'official-single');
});

test('one Department of Justice page is official', () => {
  const result = classify({
    sourceUrl: 'https://www.justice.gov/usao/example',
    sourceType: 'Primary — government source',
    sourceLabel: 'U.S. Attorney’s Office announcement',
  });
  assert.equal(result.tier, 'official-single');
});

test('one news report is unconfirmed and names the single-source label', () => {
  const result = classify({
    sourceUrl: 'https://www.courttv.com/example',
    sourceType: 'Court reporting',
    sourceLabel: 'Court TV report',
  });
  assert.deepEqual(result, { tier: 'news-single', label: NEWS_SINGLE_LABEL });
});

test('two independent sources are confirmed and carry no label', () => {
  const result = classify({
    sourceUrl: 'https://www.cbsnews.com/example',
    sourceType: 'Court reporting',
    sourceLabel: 'CBS News',
    source2Url: 'https://www.nbcboston.com/example',
    source2Label: 'NBC Boston',
  });
  assert.deepEqual(result, { tier: 'confirmed', label: null });
});

test('an X post does not count, so a docket plus X is still one official source', () => {
  const result = classify({
    sourceUrl: 'https://www.courtlistener.com/docket/1',
    sourceType: 'Primary — federal court docket',
    sourceLabel: 'Federal docket',
    source2Url: 'https://x.com/example/status/1',
    source2Label: 'Post on X',
  });
  assert.equal(result.tier, 'official-single');
});

test('a Reddit post alone is social-only', () => {
  const result = classify({
    sourceUrl: 'https://www.reddit.com/r/example/comments/1',
    sourceType: 'Named outlet',
    sourceLabel: 'Reddit post',
  });
  assert.deepEqual(result, { tier: 'social-only', label: null });
});

test('two pages from the same court are one official source', () => {
  const result = classify({
    sourceUrl: 'https://www.supremecourt.gov/docket',
    sourceType: 'Primary — court record',
    sourceLabel: 'Supreme Court of the United States, docket',
    source2Url: 'https://www.supremecourt.gov/opinions',
    source2Label: 'Supreme Court of the United States, slip opinion',
  });
  assert.equal(result.tier, 'official-single');
});

test('same-host news labels that name different outlets get the 2 news sources label', () => {
  const result = classify({
    sourceUrl: 'https://www.aol.com/one',
    sourceType: 'Named outlet',
    sourceLabel: 'Law & Crime / AOL, police announcement report',
    source2Url: 'https://www.aol.com/two',
    source2Label: 'WEHT via AOL, later report',
  });
  assert.deepEqual(result, { tier: 'news-double', label: '2 news sources' });
});

test('a single police, sheriff, corrections, or laboratory release is official', () => {
  for (const source of [
    { sourceUrl: 'https://www.troopers.ny.gov/example', sourceType: 'Primary — police release', sourceLabel: 'New York State Police update' },
    { sourceUrl: 'https://www.beaufortcountysheriff.org/example', sourceType: 'Primary — government source', sourceLabel: 'Official Beaufort County Sheriff appeal' },
    { sourceUrl: 'https://www.tdcj.texas.gov/example', sourceType: 'Primary — state agency record', sourceLabel: 'Texas Department of Criminal Justice, offender record' },
    { sourceUrl: 'https://dnasolves.com/example', sourceType: 'Primary — participating forensic laboratory', sourceLabel: 'Othram, participating laboratory announcement' },
  ]) {
    assert.equal(classify(source).tier, 'official-single', source.sourceLabel);
  }
});

test('a news report about a police announcement is not an official source', () => {
  const result = classify({
    sourceUrl: 'https://www.aol.com/one',
    sourceType: 'Named outlet',
    sourceLabel: 'Law & Crime / AOL, police announcement report',
  });
  assert.equal(result.tier, 'news-single');
});

test('the parser rejects a social-only calendar row', () => {
  const original = fs.readFileSync(new URL('../src/data/court-calendar.tsv', import.meta.url), 'utf8');
  const lines = original.trimEnd().split(/\r?\n/);
  const index = lines.findIndex((line) => line.startsWith('scheduled\t'));
  const row = lines[index].split('\t');
  row[COLUMNS.indexOf('source_url')] = 'https://x.com/example/status/1';
  row[COLUMNS.indexOf('source_label')] = 'Post on X';
  row[COLUMNS.indexOf('source2_url')] = '';
  row[COLUMNS.indexOf('source2_label')] = '';
  lines[index] = row.join('\t');
  assert.throws(() => parseCourtCalendar(lines.join('\n')), /social-only/);
});

const OFFICIAL_IDS = [
  'goncalves-wsu-trial',
  'canyon-county-idaho-child-case-oct7-suppression',
  'unconfirmed-4',
  'smith-pretrial-conference',
  'woods-restitution',
  'binkley-pretrial',
  'sydney-loofe-boswell-appeal-2026-11-03',
  'salazar-clinkunbroomer-trial',
  'mary-collins-trial',
  'chafin-case-closed',
  'completed-4',
  'duterte-trial-opening',
  'unconfirmed-3',
  'amos-pine-bluff',
  'taylor-lawrence',
  'regina-hess-identification',
  'boulder-colorado-child-homicide-investigation',
  'watkins-missing',
  'turner-dore',
];

const NEWS_IDS = [
  'isabelle-johnson-hearing',
  'unconfirmed-1',
  'unconfirmed-2',
  'unconfirmed-5',
  'ratliff-fortune',
  'hayes-delgreco-indictment',
  'martin-risner-sentencing',
  'menendez-parole-watch',
  'rawlings-rocha',
  'edwards-lamar-king',
  'collins-anoka-county-trial-watch',
  'chandler-review-watch',
  'read-civil-watch',
  'kenneth-ray-cook-review',
  'solet-houma-case',
  'inv-alisa-goods',
  'inv-east-baton-rouge-homicide',
  'inv-lashaunda-spurlock',
  'inv-nikki-winder',
  'sophia-sullivan-investigation',
  'completed-1',
  'completed-2',
  'completed-3',
  'conahan-execution-completed',
  'ryan-cavett-trial',
  'charles-byrd-sentencing',
  'oreilly-melbourne',
  'ormanjhi-triple-murder',
];

const UNCLASSIFIED_IDS = [];

const NEWS_DOUBLE_IDS = [
  'muhlenberg-county-infant-death-hearing',
];

test('recorded calendar rows keep the derived tiers and do not invent labels', () => {
  const domestic = parseCourtCalendar(fs.readFileSync(new URL('../src/data/court-calendar.tsv', import.meta.url), 'utf8'));
  const international = parseInternationalWatch(fs.readFileSync(new URL('../src/data/international-watch.tsv', import.meta.url), 'utf8'));
  const rows = [
    ...domestic.entries, ...domestic.unconfirmed, ...domestic.appeals, ...domestic.investigations, ...domestic.completed,
    ...international.listed, ...international.monitoring, ...international.concluded,
  ];
  const ids = (tier) => rows.filter((row) => row.sourceTier === tier).map((row) => row.id).sort();
  assert.deepEqual(ids('official-single'), [...OFFICIAL_IDS].sort());
  assert.deepEqual(ids('news-single'), [...NEWS_IDS].sort());
  assert.deepEqual(ids('unclassified'), [...UNCLASSIFIED_IDS].sort());
  assert.deepEqual(ids('news-double'), [...NEWS_DOUBLE_IDS].sort());
  assert.equal(ids('social-only').length, 0);
  for (const row of rows) {
    if (row.sourceTier === 'official-single') assert.equal(row.sourceTierLabel, OFFICIAL_SINGLE_LABEL);
    else if (row.sourceTier === 'news-single') assert.equal(row.sourceTierLabel, NEWS_SINGLE_LABEL);
    else if (row.sourceTier === 'news-double') assert.equal(row.sourceTierLabel, '2 news sources');
    else assert.equal(row.sourceTierLabel, null);
  }
  assert.equal(rows.find((row) => row.id === 'mangione-federal-sentencing').sourceTier, 'confirmed');
  assert.equal(rows.find((row) => row.id === 'mangione-state-double-jeopardy-hearing').sourceTier, 'confirmed');
});
