import fs from 'node:fs';
import { parseInternationalWatch } from '../src/data/international-watch-parser.mjs';

const file = new URL('../src/data/international-watch.tsv', import.meta.url);
const data = parseInternationalWatch(fs.readFileSync(file, 'utf8'));

const failures = [];
const all = [...data.listed, ...data.monitoring, ...data.concluded];

// A listed international sitting must rest on the court's own publication, not
// on a wire report of a date. This is the whole reason the page exists.
for (const row of data.listed) {
  if (!['court listing', 'court filing', 'court record'].includes(row.srcType)) {
    failures.push(`${row.id}: listed rows require a court source_type, found "${row.srcType}"`);
  }
}

for (const row of all) {
  if (!row.verified) failures.push(`${row.id}: missing verification date`);
  if (row.src2 && !row.srcLabel2) failures.push(`${row.id}: source2_url without source2_label`);
  if (row.link && !row.linkText) failures.push(`${row.id}: internal_link without link text`);
}

if (failures.length) {
  console.error(`International watch validation failed (${failures.length}):\n${failures.join('\n')}`);
  process.exit(1);
}

console.log(
  `International watch valid: ${data.listed.length} listed, ` +
  `${data.monitoring.length} monitored, ${data.concluded.length} concluded.`,
);
