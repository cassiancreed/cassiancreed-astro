import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

// A WARNING list, never a failure. The child-name guard can only see a name it already
// knows. A new case can slip in as "the death of <Name>" with no age beside the name, and
// that is how three children got through before. This prints every such phrase in the
// built pages so a person can hand-check the new ones each week:
//   "<death|murder|killing|slaying|disappearance> of <Name>"   and   "<Name>'s <death|...>"
// A phrase is listed when its text block (one paragraph, list item, heading or table cell)
// has no age in it. An adult is listed too: the list cannot tell who is a child, a person
// can. A name checked by hand goes in src/data/reviewed-victim-names.hashes (hash of the
// lowercase letters of the name, one per line, with a role comment and no name) and is not
// listed again.
const NAME_WORD = "(?:[A-Z][A-Za-z'’-]*|[A-Z]\\.)";
const NAME = `${NAME_WORD}(?:\\s+(?:${NAME_WORD}|Jr\\.?|Sr\\.?|II|III|IV)){1,4}`;
const EVENT = '(?:death|murder|killing|slaying|disappearance)';
const OF_FORM = new RegExp(`\\b${EVENT}s?\\s+of\\s+(?:(?:Dr|Mr|Mrs|Ms)\\.?\\s+)?(${NAME})`, 'g');
const POSSESSIVE_FORM = new RegExp(`(${NAME})[’']s\\s+${EVENT}\\b`, 'g');
// Words that start a place, a date or an office, not a person.
const NOT_A_PERSON = new Set(['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'the', 'this', 'that', 'his', 'her', 'their', 'our',
  'united', 'new', 'los', 'san', 'las', 'fort', 'saint', 'st', 'mount', 'lake', 'north', 'south', 'east', 'west', 'county', 'city', 'state',
  'supreme', 'district', 'court', 'federal', 'national', 'american', 'texas', 'california', 'florida', 'kansas', 'oklahoma', 'ohio',
  'idaho', 'colorado', 'arizona', 'washington', 'indiana', 'georgia', 'michigan', 'missouri', 'virginia', 'carolina', 'dakota']);
const AGE = [
  /\b[\w-]+[- ](?:year|month|week|day)s?[- ]old\b/i,
  /\b\d{1,3}\s+(?:years?|months?|weeks?|days?)\s+old\b/i,
  /\b(?:aged?|ages)\s+\d{1,3}\b/i,
  /\(\d{1,3}\)/,
  /,\s*\d{1,3},/,
];
export const hasAge = (text) => AGE.some((re) => re.test(text));
// A word in the block that suggests a child. It only sorts the list: those names are shown first.
const CHILD_WORD = /\b(?:child|children|girl|boy|teen|teens|teenage|teenager|student|infant|baby|toddler|newborn|minor|juvenile|daughter|son|kid|kids|twin|twins|preschooler|schoolgirl|schoolboy)\b/i;
export const hashOfName = (name) => createHash('sha256').update(name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z]/g, '').toLowerCase()).digest('hex');
export const reviewedHashes = (text) => new Set(text.split(/\r?\n/).map((line) => line.trim().match(/^([0-9a-f]{64})\s+#\s+\S/)).filter(Boolean).map((m) => m[1]));
// Capitalized words that start a sentence or a title in front of a name ("After <Name>'s death").
const LEADING = new Set(['after', 'before', 'since', 'during', 'has', 'is', 'was', 'did', 'does', 'will', 'why', 'how', 'what', 'when', 'where', 'who',
  'in', 'on', 'at', 'by', 'for', 'from', 'with', 'and', 'but', 'or', 'that', 'while', 'as', 'if', 'deputy', 'officer', 'sheriff', 'trooper',
  'detective', 'sergeant', 'dr', 'mr', 'mrs', 'ms', 'former', 'late', 'slain']);
const bare = (word) => word.toLowerCase().replace(/[^a-z]/g, '');
const cleanName = (name) => {
  const words = name.split(/\s+/);
  while (words.length && LEADING.has(bare(words[0]))) words.shift();
  return words.length >= 2 ? words.join(' ') : '';
};
const looksLikeAPerson = (name) => Boolean(name) && !NOT_A_PERSON.has(bare(name.split(/\s+/)[0]));

const ENTITIES = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ndash: '–', mdash: '—'};
const decode = (text) => text
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
// The visible text of a page, one text block per line.
export const textBlocks = (html) => decode(html
  .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, '\n')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<\/?(?:p|li|ul|ol|div|section|article|header|footer|main|nav|aside|h[1-6]|tr|td|th|table|details|summary|blockquote|figure|figcaption|br|dt|dd|form|label|button)\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ''))
  .split('\n').map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);

// Phrases in one block that name a person and have no age in the block.
export function phrasesWithoutAge(block, reviewed = new Set()) {
  if (hasAge(block)) return [];
  const found = [];
  for (const re of [OF_FORM, POSSESSIVE_FORM]) {
    re.lastIndex = 0;
    for (const m of block.matchAll(re)) {
      const name = cleanName(m[1].replace(/[’']s$/, ''));
      if (!looksLikeAPerson(name) || reviewed.has(hashOfName(name))) continue;
      found.push({name, phrase: m[0].replace(m[1], name), childWord: CHILD_WORD.test(block)});
    }
  }
  return found;
}

const htmlFiles = (dir) => existsSync(dir)
  ? readdirSync(dir, {withFileTypes: true}).flatMap((e) => e.isDirectory() ? htmlFiles(join(dir, e.name)) : /\.html$/.test(e.name) ? [join(dir, e.name).replace(/\\/g, '/')] : [])
  : [];
export function scan(dist = 'dist', reviewed = new Set()) {
  const byName = new Map();
  for (const file of htmlFiles(dist)) {
    const page = '/' + file.slice(dist.length + 1).replace(/index\.html$/, '').replace(/\.html$/, '');
    for (const block of textBlocks(readFileSync(file, 'utf8'))) {
      for (const hit of phrasesWithoutAge(block, reviewed)) {
        const key = hashOfName(hit.name);
        if (!byName.has(key)) byName.set(key, {name: hit.name, hash: key, pages: new Set(), phrase: hit.phrase, childWord: false});
        byName.get(key).pages.add(page);
        if (hit.childWord) byName.get(key).childWord = true;
      }
    }
  }
  return [...byName.values()].sort((a, b) => Number(b.childWord) - Number(a.childWord) || a.name.localeCompare(b.name));
}

const REVIEWED_PATH = 'src/data/reviewed-victim-names.hashes';
export function report(list) {
  if (!list.length) return 'victim-name warnings: none.';
  return [
    `WARNING (not a failure): ${list.length} name${list.length === 1 ? '' : 's'} in a "death of / murder of / killing of" phrase with no age in the same text block.`,
    'A person must check each one: a child with no Name Card must be role-only. Checked by hand and fine?',
    `Add its hash (below) to ${REVIEWED_PATH} with a role comment and no name.`,
    ...list.map((item) => `  ${item.hash}  ${item.phrase}${item.childWord ? '  <-- CHILD WORD IN BLOCK' : ''}  [${item.pages.size} page${item.pages.size === 1 ? '' : 's'}, e.g. ${[...item.pages].sort()[0]}]`),
  ].join('\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!existsSync('dist')) {
    console.log('victim-name warnings: no dist folder, skipped.');
  } else {
    const reviewed = existsSync(REVIEWED_PATH) ? reviewedHashes(readFileSync(REVIEWED_PATH, 'utf8')) : new Set();
    console.log(report(scan('dist', reviewed)));
  }
  process.exit(0);
}
