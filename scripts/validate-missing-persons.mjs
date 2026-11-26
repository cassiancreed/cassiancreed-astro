import { readFile } from 'node:fs/promises';
import { parseMissingPersons } from '../src/data/missing-persons-parser.mjs';
import {
  parseMissingPersonHolds,
  validateMissingPersonPublicationHolds,
} from '../src/data/missing-persons-holds.mjs';
import { existsSync } from 'node:fs';
import { parseOfficialImages, validateOfficialImages } from '../src/data/missing-persons-official-images.mjs';

const tsv = await readFile(new URL('../src/data/missing-persons.tsv', import.meta.url), 'utf8');
const holdsTsv = await readFile(new URL('../src/data/missing-persons-holds.tsv', import.meta.url), 'utf8');
const data = parseMissingPersons(tsv);
const holds = parseMissingPersonHolds(holdsTsv);
validateMissingPersonPublicationHolds(data.cases, holds);
const imagesTsv = await readFile(new URL('../src/data/missing-persons-official-images.tsv', import.meta.url), 'utf8');
const images = validateOfficialImages(parseOfficialImages(imagesTsv), data.cases);
for (const image of images) {
  if (!existsSync(new URL(`../public${image.image_path}`, import.meta.url))) {
    throw new Error(`missing-person official image: file not found for ${image.id}: public${image.image_path}`);
  }
}
for (const entry of data.cases) {
  if (entry.image_path) throw new Error(`missing-persons.tsv: ${entry.id} uses image_path; list official images in missing-persons-official-images.tsv instead`);
}

console.log(
  `Missing-person data valid: ${data.active.length} active, ${data.resolved.length} resolved; ` +
  `verified through ${data.metadata.last_updated}; ${holds.length} publication holds enforced; ${images.length} official images.`
);
