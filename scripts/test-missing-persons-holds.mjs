import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseMissingPersonHolds,
  validateMissingPersonPublicationHolds,
} from '../src/data/missing-persons-holds.mjs';

const holds = parseMissingPersonHolds([
  'id\tname\tdisposition\trequired_visibility\tsource_url\tcanceled_asset\tverification_date\treason',
  'amauria-carter\tAmauria Carter\tUNKNOWN\tdraft\thttps://example.gov/amauria\tCarter_Flyer_Canceled.jpg\t2026-09-30\tCanceled asset; outcome unconfirmed.',
].join('\n'));

const base = {
  id: 'amauria-carter',
  status: 'missing',
  agency_status: 'Canceled WSP flyer; disposition UNKNOWN pending agency confirmation',
  source_label: 'WSP alert',
  source2_label: '',
  summary: 'Held pending agency evidence.',
  image_path: '',
  visibility: 'draft',
};

test('held canceled flyer remains unpublished with UNKNOWN disposition', () => {
  assert.doesNotThrow(() => validateMissingPersonPublicationHolds([base], holds));
});

test('hold registry blocks a canceled flyer from publication', () => {
  assert.throws(
    () => validateMissingPersonPublicationHolds([{ ...base, visibility: 'published' }], holds),
    /must be held as draft/,
  );
});

test('canceled flyer cannot be marked resolved without agency evidence', () => {
  assert.throws(
    () => validateMissingPersonPublicationHolds([{ ...base, status: 'resolved' }], holds),
    /cannot receive a resolved disposition/,
  );
});

test('generic withdrawn evidence blocks publication even without a registry entry', () => {
  assert.throws(
    () => validateMissingPersonPublicationHolds([{
      ...base,
      id: 'future-case',
      agency_status: 'Official poster withdrawn; disposition pending agency confirmation',
      visibility: 'published',
    }], []),
    /must be held as draft/,
  );
});

test('current successor notice may remain published despite historical withdrawn notice', () => {
  assert.doesNotThrow(() => validateMissingPersonPublicationHolds([{
    ...base,
    id: 'successor-case',
    agency_status: 'Missing Child',
    summary: 'Current notice replaces a withdrawn earlier notice.',
    visibility: 'published',
  }], []));
});
