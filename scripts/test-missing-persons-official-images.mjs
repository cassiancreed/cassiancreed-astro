import assert from 'node:assert/strict';
import test from 'node:test';
import { parseOfficialImages, validateOfficialImages } from '../src/data/missing-persons-official-images.mjs';

const header = 'id\tkind\timage_path\tage_shown\tsource_label\tsource_url\treleased';
const cases = [{ id: 'jane-doe', source_url: 'https://www.missingkids.org/poster/NCMC/1/1', source2_url: '' }];
const row = (fields) => [header, fields.join('\t')].join('\n');

test('an official age progression from the record host is accepted', () => {
  const images = parseOfficialImages(row(['jane-doe', 'age_progression', '/missing-persons/official/jane-doe-age-21.jpg', '21', 'NCMEC age progression', 'https://www.missingkids.org/poster/NCMC/1/1', '2026-11-01']));
  assert.doesNotThrow(() => validateOfficialImages(images, cases));
});

test('an age progression from any other site is rejected', () => {
  const images = parseOfficialImages(row(['jane-doe', 'age_progression', '/missing-persons/official/jane-doe-age-21.jpg', '21', 'Fan-made progression', 'https://example.com/jane.jpg', '2026-11-01']));
  assert.throws(() => validateOfficialImages(images, cases), /same official site/);
});

test('an age progression must say what age it shows and who released it', () => {
  assert.throws(() => parseOfficialImages(row(['jane-doe', 'age_progression', '/missing-persons/official/jane-doe-age.jpg', '', 'NCMEC', 'https://www.missingkids.org/x', '2026-11-01'])), /age it shows/);
  assert.throws(() => parseOfficialImages(row(['jane-doe', 'photo', '/missing-persons/official/jane-doe.jpg', '', '', 'https://www.missingkids.org/x', '2026-11-01'])), /source_label/);
});

test('an image for a person not in the case list is rejected', () => {
  const images = parseOfficialImages(row(['someone-else', 'photo', '/missing-persons/official/someone-else.jpg', '', 'NCMEC poster', 'https://www.missingkids.org/x', '2026-11-01']));
  assert.throws(() => validateOfficialImages(images, cases), /not a case/);
});
