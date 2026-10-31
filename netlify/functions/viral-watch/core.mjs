// Viral Watch (Route A) — pure logic. No network, no storage, no clock reads:
// every input is passed in, so scripts/test-viral-watch.mjs and
// scripts/viral-watch-dryrun.mjs can run it offline.
// Thresholds live in src/data/viral-watch.json (THEORY v1, tune from the log).
import { createHash } from 'node:crypto';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;

// ---------------------------------------------------------------- time ----

export function zonedParts(date, timeZone = 'America/Los_Angeles') {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(date).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour), minute: Number(parts.minute) };
}

export const utcDay = (date) => date.toISOString().slice(0, 10);

export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + (m || 0);
};

// Active from start (inclusive) to end (exclusive), Pacific time. VIRAL_MAX_UNTIL
// keeps a TV/verdict night running later, but only when it is a real time no
// more than max_until_cap_hours ahead.
export function activeWindow(now, hours, maxUntilIso = '') {
  const { hour, minute } = zonedParts(now, hours.timezone);
  const t = hour * 60 + minute;
  if (t >= toMinutes(hours.start) && t < toMinutes(hours.end)) return { active: true, reason: 'in hours' };
  if (maxUntilIso) {
    // An ISO time with no Z or +hh:mm offset is read in the server's zone (UTC on
    // Netlify), 7-8 hours off from Pacific, so it is refused rather than guessed.
    const until = /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i.test(String(maxUntilIso).trim()) ? Date.parse(maxUntilIso) : NaN;
    if (Number.isNaN(until)) return { active: false, reason: 'outside hours (VIRAL_MAX_UNTIL is not a valid ISO time with Z or an offset)' };
    const ahead = until - now.getTime();
    if (ahead > 0 && ahead <= (hours.max_until_cap_hours ?? 12) * HOUR) return { active: true, reason: 'VIRAL_MAX_UNTIL night' };
    if (ahead > 0) return { active: false, reason: 'outside hours (VIRAL_MAX_UNTIL too far ahead, ignored)' };
  }
  return { active: false, reason: 'outside hours' };
}

// ----------------------------------------------------------- text utils ----

export function normalizeText(text) {
  return String(text || '')
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`]/g, "'").replace(/[“”]/g, '"')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

const sha256 = (word) => createHash('sha256').update(word.toLowerCase()).digest('hex');
export const hashWord = sha256;

const compile = (patterns = []) => patterns.map((p) => new RegExp(p, 'i'));

const US_STATES = new Set(['alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut', 'delaware',
  'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa', 'kansas', 'kentucky', 'louisiana', 'maine',
  'maryland', 'massachusetts', 'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada',
  'new hampshire', 'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon',
  'pennsylvania', 'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah', 'vermont', 'virginia',
  'washington', 'west virginia', 'wisconsin', 'wyoming', 'district of columbia']);

// A phrase containing one of these is a place or court, not a person or case name.
const NOT_A_NAME = /\b(State|v\.?|County|Township|City|Court|Circuit|District|Superior|Supreme|Appeal|Appeals|Department|Police|Sheriff|Federal|Courthouse|Judicial|Commonwealth|People)\b/;
const NAME_TOKEN = /^[A-Z][\p{L}'’.-]*$/u;
const SUFFIX = /^(Jr\.?|Sr\.?|II|III|IV)$/;

// "Lori Vallow Daybell — Idaho appeal" → ["Lori Vallow Daybell", "Lori Daybell", "Lori Vallow"]
export function extractCaseTerms(caseName) {
  const raw = String(caseName || '');
  const nicknames = [...raw.matchAll(/[“"]([^”"]+)[”"]/g)].map((m) => m[1].trim());
  const base = raw.replace(/\s*[“"][^”"]+[”"]\s*/g, ' ');
  const parts = [];
  let depth = 0; let current = ''; let inParen = false;
  for (const ch of base) {
    if (ch === '(') { if (current.trim()) parts.push({ text: current, paren: inParen }); current = ''; depth += 1; inParen = true; continue; }
    if (ch === ')') { if (current.trim()) parts.push({ text: current, paren: inParen }); current = ''; depth = Math.max(0, depth - 1); inParen = depth > 0; continue; }
    current += ch;
  }
  if (current.trim()) parts.push({ text: current, paren: inParen });
  const terms = [];
  const add = (t) => { if (t && !terms.includes(t)) terms.push(t); };
  for (const part of parts.flatMap((p) => p.text.split(/\s+[—–-]\s+|,/).map((text) => ({ text, paren: p.paren })))) {
    const tokens = part.text.trim().split(/\s+/).filter(Boolean);
    let run = [];
    const flush = () => {
      while (run.length && SUFFIX.test(run[run.length - 1])) run.pop();
      if (run.length >= 2 && run.length <= 4) {
        const phrase = run.join(' ').replace(/[.,;:]+$/, '');
        if (!NOT_A_NAME.test(phrase) && !US_STATES.has(phrase.toLowerCase())) {
          add(phrase);
          if (!part.paren && run.length >= 3) {
            add(`${run[0]} ${run[run.length - 1]}`);
            add(`${run[0]} ${run[1]}`);
          }
          if (!part.paren && nicknames.length) for (const nick of nicknames) add(`${nick} ${run[run.length - 1]}`);
        }
      }
      run = [];
    };
    for (const token of tokens) {
      if (NAME_TOKEN.test(token) || (run.length && SUFFIX.test(token))) run.push(token);
      else flush();
    }
    flush();
  }
  return terms;
}

// The row's status text decides which status words a draft may use. Convicted
// only when the record says so and nothing in it says the person is presumed
// innocent or the conviction is gone; anything unclear is treated as charged.
export function isConvictedStatus(statusText) {
  const s = normalizeText(statusText);
  const convicted = /\bconvict(ed|ion|ions)\b|\bfound guilty\b|\bpleaded guilty\b|\bpled guilty\b|\bguilty plea\b|\bguilty verdict\b/.test(s);
  const negated = /\b(no|not|never|without)\s+(been\s+)?(a\s+)?(conviction|convicted)\b|\boverturned\b|\bvacated\b|\bacquitt|\bpresumed innocent\b/.test(s);
  return convicted && !negated;
}

// ----------------------------------------------------------- watch list ----

// Our page for a case: the first free NEP post the calendar already links
// (calendarLinksFor only returns published, non-archived posts), else the
// case's live $1.99 guide. No page → the case is not watched.
function pageFor(rows, linksFor) {
  const linksOf = (row) => (linksFor ? linksFor(row) : (row.link ? [{ type: 'free', url: row.link }] : []));
  for (const row of rows) {
    const free = linksOf(row).find((l) => l.type === 'free' && typeof l.url === 'string' && l.url.startsWith('/post/'));
    if (free) return { url: 'https://cassiancreed.com' + free.url.split('?')[0], kind: 'free' };
  }
  for (const row of rows) {
    const paid = linksOf(row).find((l) => l.type === 'paid' && typeof l.url === 'string' && l.url.startsWith('https://'));
    if (paid) return { url: paid.url.split('?')[0], kind: 'paid' };
  }
  return null;
}

const caseKeyOf = (name) => normalizeText(String(name).split(/\s+[—–-]\s+/)[0]).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// calendar = parseCourtCalendar(tsv). Returns one entry per case, soonest row first.
export function buildWatchList(calendar, { today, cfg, linksFor }) {
  const w = cfg.watch;
  const from = addDays(today, -(w.lookback_days || 0));
  const to = addDays(today, w.days_ahead ?? 7);
  const exclude = compile(w.exclude_case_patterns);
  const pools = {
    scheduled: calendar.entries, unconfirmed: calendar.unconfirmed, appeal: calendar.appeals, completed: calendar.completed,
  };
  const rows = [];
  for (const section of w.sections || []) {
    for (const row of pools[section] || []) {
      const inRange = row.dateISO && row.dateISO >= from && row.dateISO <= to;
      if (!inRange && !(row.ongoing && row.dateISO && row.dateISO <= to)) continue;
      const text = `${row.case} ${row.proceeding} ${row.status}`;
      if (exclude.some((re) => re.test(text))) continue;
      rows.push({ ...row, section });
    }
  }
  const byCase = new Map();
  for (const row of rows) {
    const key = caseKeyOf(row.case);
    if (!byCase.has(key)) byCase.set(key, []);
    byCase.get(key).push(row);
  }
  const drop = new Set((w.drop_terms || []).map(normalizeText));
  const list = [];
  for (const [key, caseRows] of byCase) {
    // Soonest upcoming row first; a row from today/yesterday wins over later ones.
    caseRows.sort((a, b) => Math.abs(Date.parse(a.dateISO) - Date.parse(today)) - Math.abs(Date.parse(b.dateISO) - Date.parse(today)));
    const row = caseRows[0];
    const override = (w.term_overrides || []).find((o) => caseRows.some((r) => r.case.includes(o.case_contains)));
    const terms = (override ? override.terms : caseRows.flatMap((r) => extractCaseTerms(r.case)))
      .filter((t, i, all) => all.indexOf(t) === i && !drop.has(normalizeText(t)))
      .slice(0, w.max_terms_per_case || 4);
    if (!terms.length) continue;
    list.push({
      key, name: row.case, terms, termsNorm: terms.map(normalizeText), row, rows: caseRows,
      page: pageFor(caseRows, linksFor), convicted: isConvictedStatus(row.status), date: row.dateISO,
    });
  }
  return list.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}

// Names that belong to the watched cases (all adults named in NEP's own calendar).
export function adultTokensFor(watch) {
  const tokens = new Set();
  for (const c of watch) for (const t of [...c.terms, c.name]) for (const w of String(t).split(/[^\p{L}'’-]+/u)) if (w) tokens.add(w.toLowerCase());
  return tokens;
}

// --------------------------------------------------------------- queries ----

const BASE_OPS = '-is:retweet -is:reply lang:en';
export const queryKey = (q) => createHash('sha1').update(q).digest('hex').slice(0, 12);

function chunkGroup(items, prefix, suffix, maxChars) {
  const chunks = [];
  let current = [];
  const render = (list) => `${prefix}(${list.join(' OR ')}) ${suffix}`.replace(/\s+/g, ' ').trim();
  for (const item of items) {
    const next = [...current, item];
    if (current.length && render(next).length > maxChars) { chunks.push(render(current)); current = [item]; } else current = next;
  }
  if (current.length) chunks.push(render(current));
  return chunks.filter((q) => q.length <= maxChars);
}

export function verifiedHandles(cfg) {
  const t = cfg.tier_a_handles || {};
  return (t.handles || []).filter((h) => h.status === 'verified' || t.use_unverified).map((h) => String(h.handle).replace(/^@/, ''));
}

// Case queries carry min_likes (rolling start_time window, no since_id).
// Tier A queries carry no threshold and use since_id.
export function buildQueries(watch, cfg, flags = {}) {
  const x = cfg.x;
  const max = x.query_max_chars || 512;
  const useMinLikes = !flags.min_likes_unsupported && x.min_likes > 0;
  const terms = watch.filter((c) => c.page).flatMap((c) => c.terms.map((t) => `"${t.replace(/"/g, '')}"`));
  const unique = terms.filter((t, i) => terms.indexOf(t) === i);
  const caseSuffix = `${BASE_OPS}${useMinLikes ? ` min_likes:${x.min_likes}` : ''}`;
  const queries = chunkGroup(unique, '', caseSuffix, max).map((q) => ({ kind: 'case', q, threshold: useMinLikes }));
  const handles = verifiedHandles(cfg);
  if (handles.length) {
    const handleGroup = `(${handles.map((h) => `from:${h}`).join(' OR ')}) `;
    const tierMin = cfg.tier_a_handles.min_likes > 0 && !flags.min_likes_unsupported ? ` min_likes:${cfg.tier_a_handles.min_likes}` : '';
    for (const q of chunkGroup(cfg.event_words || [], handleGroup, `${BASE_OPS}${tierMin}`, max)) {
      queries.push({ kind: 'tier_a', q, threshold: Boolean(tierMin) });
    }
  }
  return queries.slice(0, x.max_queries_per_run || 4).map((query) => ({ ...query, key: queryKey(query.q) }));
}

// ------------------------------------------------------------- matching ----

export function matchCase(text, watch) {
  const t = normalizeText(text);
  let best = null;
  for (const c of watch) {
    const hits = c.termsNorm.filter((term) => t.includes(term)).length;
    if (hits && (!best || hits > best.hits)) best = { c, hits };
  }
  return best ? best.c : null;
}

const CAP_STOP = new Set(['the', 'a', 'an', 'this', 'that', 'her', 'his', 'their', 'our', 'my', 'your', 'its', 'he', 'she',
  'they', 'we', 'i', 'and', 'but', 'or', 'police', 'judge', 'court', 'jury', 'prosecutors', 'defense', 'officials',
  'authorities', 'sheriff', 'deputies', 'mom', 'mother', 'father', 'dad', 'breaking', 'update', 'today', 'tonight',
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'january', 'february', 'march', 'april',
  'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december', 'doe', 'baby', 'little', 'young',
  'when', 'after', 'before', 'while', 'who', 'was', 'is', 'were', 'news', 'live', 'new', 'old', 'year', 'years']);

const MINOR_WORDS = '(?:toddler|infant|newborn|baby|child|kid|preschooler|kindergartner|minor|juvenile|teen|teenager|boy|girl|schoolgirl|schoolboy|daughter|son|stepdaughter|stepson|grandson|granddaughter|niece|nephew|student|grader)s?';
const MINOR_AGE = '(?:[1-9]|1[0-7])[-\\s]?(?:year|yr|month|week|day)s?[-\\s]?old';
const NAME = "([A-Z][a-z][a-zA-Z'’-]*)";
const MINOR_NAME_PATTERNS = [
  new RegExp(`\\b${MINOR_WORDS}[,:]?\\s+(?:named\\s+)?${NAME}`, 'g'), // "son Dawson", "daughter, Ava"
  new RegExp(`${NAME},?\\s+(?:a\\s+|an\\s+|the\\s+)?(?:${MINOR_AGE}|toddler|infant|baby|newborn)\\b`, 'g'), // "Ava, 5-year-old"
  new RegExp(`\\b${MINOR_AGE}\\s+(?:${MINOR_WORDS}\\s+)?${NAME}`, 'g'), // "5-year-old Ava"
  new RegExp(`${NAME},\\s+(?:age[d]?\\s+)?(?:[1-9]|1[0-7])\\s*[,.)]`, 'g'), // "Ava, 5,"
  new RegExp(`${NAME}\\s*\\(\\s*(?:age[d]?\\s+)?(?:[1-9]|1[0-7])\\s*\\)`, 'g'), // "Ava (5)"
];

// Returns a reason string when the text names (or likely names) someone under 18.
export function minorShieldHit(text, { hashes = [], adultTokens = new Set() } = {}) {
  const source = String(text || '');
  const hashSet = new Set(hashes);
  for (const m of source.matchAll(/[A-Za-z]+/g)) if (hashSet.has(sha256(m[0]))) return 'minor name on the block list';
  for (const re of MINOR_NAME_PATTERNS) {
    re.lastIndex = 0;
    for (const m of source.matchAll(re)) {
      const name = (m[1] || '').toLowerCase();
      if (!name || CAP_STOP.has(name) || adultTokens.has(name) || US_STATES.has(name)) continue;
      return `possible child named ("${m[0].slice(0, 40)}")`;
    }
  }
  return null;
}

// ------------------------------------------------------------ long posts ----

// X returns only the first part of a long post (over 280 characters) in `text`;
// the whole post is in note_tweet.text (the newer API reference calls it
// note_post). Every screen and the case match read the whole post.
export function fullText(post) {
  return String(post?.note_tweet?.text || post?.note_post?.text || post?.text || '');
}

// When X will not send note_tweet, a post this long may be cut off, so its
// hidden part cannot be screened: skip it.
export const LONG_POST_CHARS = 270;
export const mayBeCut = (post) => !post?.note_tweet?.text && !post?.note_post?.text && charCount(post?.text) >= LONG_POST_CHARS;

// ------------------------------------------------------------ block list ----

// Block list for slurs and violent or sexual words, checked on the source post
// (skip) and on every draft (no alert). safety.block_words are plain words and
// phrases, matched whole-word and case-insensitive. safety.block_word_hashes are
// SHA-256 hashes of lowercase single words (slurs), so this public repo never
// spells them out; every word in the text is hashed and compared.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const blockCache = new WeakMap();
function blockRegex(safety) {
  if (!blockCache.has(safety)) {
    const words = (safety.block_words || []).map((w) => String(w).trim()).filter(Boolean);
    blockCache.set(safety, words.length ? new RegExp(`(?<![\\p{L}\\p{N}_])(?:${words.map((w) => escapeRe(w).replace(/\s+/g, '\\s+')).join('|')})(?![\\p{L}\\p{N}_])`, 'iu') : null);
  }
  return blockCache.get(safety);
}

export function blockWordHit(text, safety = {}) {
  const n = String(text || '').normalize('NFKC');
  const re = blockRegex(safety);
  const m = re && n.match(re);
  if (m) return `block list word "${m[0].toLowerCase()}"`;
  const hashes = new Set(safety.block_word_hashes || []);
  if (hashes.size) for (const w of n.matchAll(/[\p{L}]+/gu)) if (hashes.has(sha256(w[0]))) return 'block list word (hashed slur)';
  return null;
}

export function postSkipReason(post, match, cfg, adultTokens) {
  const text = fullText(post);
  const minor = minorShieldHit(text, { hashes: cfg.safety.minor_name_hashes, adultTokens });
  if (minor) return `minor_shield: ${minor}`;
  if (post.possibly_sensitive) return 'sensitive_media';
  const graphic = compile(cfg.safety.post_skip_patterns).find((re) => re.test(text));
  if (graphic) return `graphic: ${graphic.source}`;
  const blocked = blockWordHit(text, cfg.safety);
  if (blocked) return blocked;
  if (!match) return 'no_case_match';
  if (!match.page) return 'no_page';
  return null;
}

// --------------------------------------------------------------- scoring ----

export function metricsOf(pm = {}) {
  const likes = pm.like_count || 0; const reposts = pm.retweet_count || 0;
  const replies = pm.reply_count || 0; const quotes = pm.quote_count || 0;
  return { imp: pm.impression_count || 0, likes, reposts, replies, quotes, eng: likes + reposts + replies + quotes };
}

export function growthPct(prev, cur) {
  if (!prev || !cur) return null;
  const useImp = prev.imp > 0 && cur.imp > 0;
  const a = useImp ? prev.imp : prev.eng;
  const b = useImp ? cur.imp : cur.eng;
  if (a <= 0) return b > 0 ? 100 : 0;
  return Math.round(((b - a) / a) * 1000) / 10;
}

export const meetsSize = (m, t) => m.imp >= t.min_impressions || m.eng >= t.min_engagement;

// THEORY v1. HOT: ≤60 min old, big enough, ≥20% growth since last check.
// WARM: 60–180 min old, big enough, still growing.
export function classify({ createdAt, prev, cur, nowMs, cfg }) {
  const ageMin = (nowMs - Date.parse(createdAt)) / MINUTE;
  const growth = growthPct(prev, cur);
  const base = { ageMin: Math.round(ageMin * 10) / 10, growth, metrics: cur };
  if (growth === null) return { ...base, level: null, reason: 'first check' };
  const { hot, warm } = cfg.score;
  if (ageMin <= hot.max_age_min) {
    if (!meetsSize(cur, hot)) return { ...base, level: null, reason: 'too small' };
    if (growth < hot.min_growth_pct) return { ...base, level: null, reason: 'growth under HOT bar' };
    return { ...base, level: 'HOT', reason: 'HOT' };
  }
  if (ageMin <= warm.max_age_min) {
    if (!meetsSize(cur, warm)) return { ...base, level: null, reason: 'too small' };
    if (!(growth > warm.min_growth_pct)) return { ...base, level: null, reason: 'not growing' };
    return { ...base, level: 'WARM', reason: 'WARM' };
  }
  return { ...base, level: null, reason: 'too old' };
}

// ------------------------------------------------------------ code checks ----

const NEGATED_STATUS = /\b(pleaded|pled|pleads|plead|found|verdict of|finding of)\s+not\s+guilty\b|\bnot\s+guilty\s+plea\b|\b(has|have|had|was|were|is|are)?\s*(not|never)\s+(been\s+)?(convicted|found guilty)\b|\bno\s+(verdict|conviction|finding of guilt)\b|\bnot a finding of guilt\b/gi;

export function charCount(text) { return [...String(text || '')].length; }

// Link-shaped text. Any word.word with a 2+ letter ending counts (t.me, discord.gg,
// scam.xyz, an e-mail domain), not only a fixed list of endings, plus "http",
// "www" and spelled-out "dot com". Over-blocking only costs a redraft.
const LINK_PATTERNS = [/http/i, /\bwww/i, /[\p{L}\p{N}_-]\.\p{L}{2,}/u, /\bdot\s*(com|net|org|io|co|ly|gg|me|xyz|app|info|biz|link|site|tv|us)\b/i];
// X treats a # / @ / $ after any non-word character (not only a space) as a
// hashtag, mention or cashtag. NFKC first, so full-width ＃ ＠ ＄ count too.
const HASHTAG = /(^|[^\p{L}\p{N}_&])#[\p{L}\p{N}_]+/gu;
const MENTION = /(^|[^\p{L}\p{N}_])@[A-Za-z0-9_]/u;
const CASHTAG = /(^|[^\p{L}\p{N}_])\$[A-Za-z][A-Za-z_]{0,5}\b/u;
const PHONE = /(\+\d[\d\s().-]{7,}\d)|(\(?\b\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b)/;

export function checkDraft(text, { level, convicted, cfg, adultTokens = new Set() }) {
  const failed = [];
  const t = String(text || '').trim();
  const c = cfg.council; const s = cfg.safety;
  if (!t) return { pass: false, failed: ['empty draft'] };
  const n = t.normalize('NFKC');
  const len = charCount(t);
  if (len > c.max_chars) failed.push(`too long: ${len} chars (max ${c.max_chars})`);
  if (LINK_PATTERNS.some((re) => re.test(n))) failed.push(level === 'HOT' ? 'link in a reply' : 'link in the text (it goes in the url field)');
  const tags = (n.match(HASHTAG) || []).length;
  if (tags > c.max_hashtags) failed.push(`${tags} hashtags (max ${c.max_hashtags})`);
  if (MENTION.test(n)) failed.push('@mention in text');
  if (CASHTAG.test(n)) failed.push('$cashtag in text');
  if (PHONE.test(n)) failed.push('phone number in text');
  for (const re of compile(s.draft_block_patterns)) { const m = n.match(re); if (m) failed.push(`blocked word "${m[0]}"`); }
  const listed = blockWordHit(n, s);
  if (listed) failed.push(listed);
  for (const re of compile(s.bait_patterns)) { const m = n.match(re); if (m) failed.push(`bait "${m[0]}"`); }
  if (!convicted) {
    const stripped = n.replace(NEGATED_STATUS, ' ');
    for (const re of compile(s.guilt_patterns_unless_convicted)) {
      const m = stripped.match(re);
      if (m) failed.push(`status word "${m[0]}" is stronger than the record (not convicted)`);
    }
  }
  const minor = minorShieldHit(t, { hashes: s.minor_name_hashes, adultTokens });
  if (minor) failed.push(`Minor Shield: ${minor}`);
  return { pass: failed.length === 0, failed };
}

export function cleanDraft(raw) {
  let t = String(raw || '').trim();
  t = t.replace(/^```[a-z]*\s*|\s*```$/g, '').trim();
  t = t.replace(/^(reply|post|draft|our reply|our post)\s*:\s*/i, '').trim();
  if (/^["“'].*["”']$/s.test(t)) t = t.slice(1, -1).trim();
  return t.replace(/\s*\n+\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

// ----------------------------------------------------------------- judge ----

export function parseJudge(raw) {
  const text = String(raw || '').replace(/```(?:json)?/gi, '');
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const j = JSON.parse(text.slice(start, end + 1));
    const scores = {};
    for (const [k, v] of Object.entries(j.scores || {})) scores[k] = Number(v);
    return {
      hard_checks_pass: j.hard_checks_pass === true,
      failed: Array.isArray(j.failed) ? j.failed.map(String) : ['failed list missing'],
      scores,
      weighted: Number(j.weighted),
      verdict: String(j.verdict || '').toUpperCase(),
      fix: typeof j.fix === 'string' ? j.fix.trim() : '',
    };
  } catch {
    return null;
  }
}

export function weightedScore(scores, weights) {
  let sum = 0; let total = 0;
  for (const [name, w] of Object.entries(weights)) { sum += (scores[name] || 0) * w; total += w; }
  return total ? Math.round((sum / total) * 100) / 100 : 0;
}

// The code recomputes the weighted score; the judge's own arithmetic is logged, not trusted.
export function judgePasses(judge, cfg) {
  const c = cfg.council;
  if (!judge) return { pass: false, weighted: 0, reasons: ['judge reply was not valid JSON'] };
  const reasons = [];
  const bad = Object.keys(c.weights).filter((k) => !Number.isFinite(judge.scores[k]) || judge.scores[k] < 0 || judge.scores[k] > 10);
  if (bad.length) reasons.push(`missing or invalid scores: ${bad.join(', ')}`);
  const weighted = weightedScore(judge.scores, c.weights);
  if (!judge.hard_checks_pass) reasons.push('hard checks did not pass');
  if (judge.failed.length) reasons.push(`failed checks: ${judge.failed.join(', ')}`);
  if (weighted < c.pass_weighted) reasons.push(`weighted ${weighted.toFixed(2)} < ${c.pass_weighted}`);
  if ((judge.scores.Ryan ?? 0) < c.ryan_floor) reasons.push(`Ryan ${judge.scores.Ryan} under floor ${c.ryan_floor}`);
  if (judge.verdict !== 'PASS') reasons.push(`verdict ${judge.verdict || 'missing'}`);
  return { pass: reasons.length === 0, weighted, checksPassed: Math.max(0, 8 - judge.failed.length), reasons };
}

// ----------------------------------------------------------------- alert ----

export function formatCount(n) {
  const v = Number(n) || 0;
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1).replace(/\.0$/, '')}K`;
  return String(Math.round(v));
}

const shortCase = (name) => {
  const first = String(name).split(/\s+[—–]\s+/)[0].trim();
  return first.length > 60 ? `${first.slice(0, 57)}...` : first;
};

export function buildAlert({ topic, level, caseName, username, ageMin, metrics, growth, text, weighted, checksPassed, postId, pageUrl }) {
  if (!/^\d+$/.test(String(postId))) throw new Error('post id must be numeric');
  const hot = level === 'HOT';
  const who = username ? `@${username}` : 'Post';
  const reach = metrics.imp > 0 ? `${formatCount(metrics.imp)} views` : `${formatCount(metrics.eng)} engagements`;
  const lines = [
    `${who} · ${Math.max(0, Math.round(ageMin))} min · ${reach}, up ${Math.round(growth)}%`,
    `${hot ? 'Our reply' : 'Our post'}: ${text}`,
    `Checked: ${Number(weighted).toFixed(2)} · ${checksPassed}/8`,
  ];
  const primary = hot
    ? { action: 'view', label: 'Reply on X', url: `https://x.com/intent/tweet?in_reply_to=${postId}&text=${encodeURIComponent(text)}`, clear: true }
    : { action: 'view', label: 'Post on X', url: `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`, clear: true };
  return {
    topic,
    title: `${hot ? 'HOT reply' : 'Post chance'}: ${shortCase(caseName)}`,
    message: lines.join('\n'),
    priority: 4,
    tags: [hot ? 'fire' : 'thermometer'],
    click: primary.url,
    actions: [primary, { action: 'view', label: 'See post', url: `https://x.com/i/status/${postId}` }],
  };
}

// ----------------------------------------------------------------- state ----

export function emptyState() {
  return {
    v: 1,
    since: {},
    tracked: {},
    skipped: {},
    cooldowns: {},
    flags: {},
    daily: { day: '', alerts: 0, councils: 0, perAccount: {} },
    budget: { day: '', posts: [], users: [] },
  };
}

export function rollState(input, { laDay, utc, nowMs, cfg }) {
  const state = { ...emptyState(), ...(input || {}) };
  for (const k of ['since', 'tracked', 'skipped', 'cooldowns', 'flags']) state[k] = { ...(state[k] || {}) };
  if (!state.daily || state.daily.day !== laDay) state.daily = { day: laDay, alerts: 0, councils: 0, perAccount: {} };
  if (!state.budget || state.budget.day !== utc) state.budget = { day: utc, posts: [], users: [] };
  const maxAge = (cfg.score.warm.max_age_min + 10) * MINUTE;
  for (const [id, p] of Object.entries(state.tracked)) if (nowMs - Date.parse(p.created_at) > maxAge) delete state.tracked[id];
  for (const [id, t] of Object.entries(state.skipped)) if (nowMs - t > maxAge) delete state.skipped[id];
  const cool = cfg.limits.case_cooldown_hours * HOUR;
  for (const [k, t] of Object.entries(state.cooldowns)) if (nowMs - t > cool) delete state.cooldowns[k];
  for (const [k, s] of Object.entries(state.since)) if (nowMs - Date.parse(s.at) > 2 * 24 * HOUR) delete state.since[k];
  return state;
}

// Keep the biggest posts when over max_tracked.
export function pruneTracked(tracked, max) {
  const entries = Object.entries(tracked);
  if (entries.length <= max) return tracked;
  const last = (p) => p.checks[p.checks.length - 1]?.m || { eng: 0, imp: 0 };
  entries.sort(([, a], [, b]) => (last(b).imp + last(b).eng * 40) - (last(a).imp + last(a).eng * 40));
  return Object.fromEntries(entries.slice(0, max));
}
