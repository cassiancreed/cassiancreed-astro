import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');

const doctrinePath = 'docs/NEP-Case-Handling-Doctrine-v2.0.md';
const doctrine = read(doctrinePath);
const agents = read('AGENTS.md');
const calendarGuide = read('src/data/COURT_CALENDAR_README.md');

const requiredDoctrineText = [
  '# NEP CASE-HANDLING DOCTRINE v2.0',
  'This is the only case-handling doctrine.',
  '## L2 — Standing conviction; review open',
  '### 🆕 L2-provisional — window open, nothing lodged',
  '### L2-active — challenge lodged',
  '### 🆕 L2-denovo — the appeal is a fresh hearing',
  '## L3 — Under prosecution; no conviction',
  '## L4 — No standing conviction',
  '### 🆕 L4-provisional — the acquittal can still be appealed',
  'Risk changes treatment, not inclusion.',
];

for (const text of requiredDoctrineText) {
  if (!doctrine.includes(text)) {
    throw new Error(`${doctrinePath} is missing canonical doctrine text: ${text}`);
  }
}

for (const [path, contents] of [
  ['AGENTS.md', agents],
  ['src/data/COURT_CALENDAR_README.md', calendarGuide],
]) {
  if (!contents.includes('NEP-Case-Handling-Doctrine-v2.0.md')) {
    throw new Error(`${path} must point to the canonical v2.0 doctrine.`);
  }
  if (!contents.includes('sole authoritative')) {
    throw new Error(`${path} must identify v2.0 as the sole authoritative doctrine.`);
  }
}

console.log('Case-handling canon valid: v2.0 present, complete, and authoritative references intact.');
