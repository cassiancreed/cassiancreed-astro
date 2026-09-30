import { readFile } from 'node:fs/promises';
import { parseMissingPersons } from '../src/data/missing-persons-parser.mjs';
import {
  parseMissingPersonHolds,
  validateMissingPersonPublicationHolds,
} from '../src/data/missing-persons-holds.mjs';

const tsv = await readFile(new URL('../src/data/missing-persons.tsv', import.meta.url), 'utf8');
const holdsTsv = await readFile(new URL('../src/data/missing-persons-holds.tsv', import.meta.url), 'utf8');
const data = parseMissingPersons(tsv);
const holds = parseMissingPersonHolds(holdsTsv);
validateMissingPersonPublicationHolds(data.cases, holds);

console.log(
  `Missing-person data valid: ${data.active.length} active, ${data.resolved.length} resolved; ` +
  `verified through ${data.metadata.last_updated}; ${holds.length} publication holds enforced.`
);
