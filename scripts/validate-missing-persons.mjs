import { readFile } from 'node:fs/promises';
import { parseMissingPersons } from '../src/data/missing-persons-parser.mjs';

const tsv = await readFile(new URL('../src/data/missing-persons.tsv', import.meta.url), 'utf8');
const data = parseMissingPersons(tsv);

console.log(
  `Missing-person data valid: ${data.active.length} active, ${data.resolved.length} resolved; ` +
  `verified through ${data.metadata.last_updated}.`
);
