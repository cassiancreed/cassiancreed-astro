const COLUMNS = [
  'section', 'id', 'case', 'proceeding', 'date_iso', 'date_text', 'timezone', 'time_status', 'court', 'docket',
  'verified', 'ongoing', 'groups', 'status', 'detail', 'next_note', 'source_url',
  'source_label', 'source_type', 'source2_url', 'source2_label', 'internal_link',
  'internal_link_text', 'internal_link2', 'internal_link2_text', 'faq_question',
];

const VALID_SECTIONS = new Set(['meta', 'scheduled', 'unconfirmed', 'appeal', 'completed']);
const VALID_GROUPS = new Set(['next', 'trials', 'hearings', 'sentencing']);
const VALID_TIME_STATUSES = new Set(['confirmed', 'tentative', 'superseded', 'not publicly verified']);
const DATE_METADATA = new Set(['last_updated']);
const TEXT_METADATA = new Set(['page_title', 'page_description']);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const fail = (line, message) => {
  throw new Error(`court-calendar.tsv line ${line}: ${message}`);
};

const requireFields = (row, fields, line) => {
  for (const field of fields) if (!row[field]) fail(line, `missing required field "${field}"`);
};

const checkUrl = (value, field, line, internal = false) => {
  if (!value) return;
  if (internal) {
    if (value.startsWith('/') && !value.startsWith('//')) return;
    fail(line, `${field} must be a same-site path beginning with "/"`);
  }
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    fail(line, `invalid ${field} URL "${value}"`);
  }
};

export function parseCourtCalendar(tsv) {
  const lines = tsv.replace(/^\uFEFF/, '').replace(/\r?\n$/, '').split(/\r?\n/);
  if (lines.length < 2) throw new Error('court-calendar.tsv has no data rows');
  const headers = lines[0].split('\t');
  if (headers.join('\t') !== COLUMNS.join('\t')) {
    throw new Error(`court-calendar.tsv header must be exactly: ${COLUMNS.join('\t')}`);
  }

  const parsed = [];
  const seenIds = new Set();
  for (let index = 1; index < lines.length; index += 1) {
    const line = index + 1;
    if (!lines[index].trim()) continue;
    const cells = lines[index].split('\t');
    if (cells.length !== COLUMNS.length) fail(line, `expected ${COLUMNS.length} columns, found ${cells.length}`);
    const row = Object.fromEntries(COLUMNS.map((column, i) => [column, cells[i].trim()]));
    if (!VALID_SECTIONS.has(row.section)) fail(line, `invalid section "${row.section}"`);
    requireFields(row, ['section', 'id', 'status'], line);
    if (seenIds.has(row.id)) fail(line, `duplicate id "${row.id}"`);
    seenIds.add(row.id);

    if (row.section === 'meta') {
      if (![...DATE_METADATA, ...TEXT_METADATA].includes(row.id)) fail(line, `unknown metadata id "${row.id}"`);
      if (DATE_METADATA.has(row.id) && !DATE_RE.test(row.status)) fail(line, `metadata status must be YYYY-MM-DD`);
      parsed.push({ ...row, line });
      continue;
    }

    requireFields(row, ['case', 'proceeding', 'court', 'source_url', 'source_label', 'source_type'], line);
    checkUrl(row.source_url, 'source_url', line);
    checkUrl(row.source2_url, 'source2_url', line);
    checkUrl(row.internal_link, 'internal_link', line, true);
    checkUrl(row.internal_link2, 'internal_link2', line, true);

    if (row.time_status && !VALID_TIME_STATUSES.has(row.time_status)) fail(line, `invalid time_status "${row.time_status}"`);
    if (row.timezone) {
      try { new Intl.DateTimeFormat('en-US', { timeZone: row.timezone }).format(); }
      catch { fail(line, `invalid IANA timezone "${row.timezone}"`); }
    }

    if (row.section === 'scheduled') {
      requireFields(row, ['date_iso', 'date_text', 'detail', 'groups'], line);
      if (!DATE_RE.test(row.date_iso)) fail(line, `date_iso must be YYYY-MM-DD`);
      if (Number.isNaN(Date.parse(`${row.date_iso}T00:00:00Z`))) fail(line, `date_iso is not a real date`);
      const groups = row.groups.split('|').filter(Boolean);
      if (!groups.includes('next')) fail(line, 'scheduled rows must include the "next" group');
      for (const group of groups) if (!VALID_GROUPS.has(group)) fail(line, `invalid group "${group}"`);
      if (row.ongoing && row.ongoing !== 'true') fail(line, 'ongoing must be blank or true');
    }
    parsed.push({ ...row, line });
  }

  const metadata = Object.fromEntries(parsed.filter((r) => r.section === 'meta').map((r) => [r.id, r.status]));
  for (const id of [...DATE_METADATA, ...TEXT_METADATA]) {
    if (!metadata[id]) throw new Error(`court-calendar.tsv requires metadata row "${id}"`);
  }

  const scheduled = parsed.filter((r) => r.section === 'scheduled').map((r) => ({
    id: r.id, case: r.case, proceeding: r.proceeding, dateISO: r.date_iso,
    dateText: r.date_text, timezone: r.timezone || null, timeStatus: r.time_status || null,
    court: r.court, docket: r.docket || null,
    verified: r.verified || null, ongoing: r.ongoing === 'true',
    groups: r.groups.split('|').filter(Boolean), status: r.status, detail: r.detail,
    nextNote: r.next_note || null, src: r.source_url, srcLabel: r.source_label,
    srcType: r.source_type, src2: r.source2_url || null, srcLabel2: r.source2_label || null,
    link: r.internal_link || null, linkText: r.internal_link_text || null,
    link2: r.internal_link2 || null, linkText2: r.internal_link2_text || null,
    faqQuestion: r.faq_question || null,
  }));

  const passive = (section) => parsed.filter((r) => r.section === section).map((r) => ({
    id: r.id, case: r.case, type: section === 'appeal' ? r.proceeding : null,
    where: r.court, timezone: r.timezone || null, timeStatus: r.time_status || null,
    docket: r.docket || null, verified: r.verified || null,
    status: r.status, note: r.detail, nextNote: r.next_note || null,
    src: r.source_url, srcLabel: r.source_label, srcType: r.source_type,
    src2: r.source2_url || null, srcLabel2: r.source2_label || null,
    link: r.internal_link || null, linkText: r.internal_link_text || null,
    faqQuestion: r.faq_question || null,
  }));

  return {
    metadata,
    entries: scheduled,
    unconfirmed: passive('unconfirmed'),
    appeals: passive('appeal'),
    completed: passive('completed'),
  };
}

export function formatCalendarDate(iso) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

export { COLUMNS };
