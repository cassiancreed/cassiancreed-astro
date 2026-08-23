const COLUMNS = [
  'kind', 'id', 'name', 'status', 'agency_status', 'approx_location', 'region', 'country',
  'latitude', 'longitude', 'map_precision', 'date_missing', 'investigating_agency',
  'case_number', 'verification_date', 'source_type', 'source_url', 'source_label',
  'source2_url', 'source2_label', 'tip_url', 'tip_label', 'tip_phone', 'article_path',
  'image_path', 'follow_key', 'summary', 'visibility',
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const VALID_KINDS = new Set(['meta', 'case']);
const VALID_STATUSES = new Set([
  'missing', 'endangered', 'involuntarily_missing', 'abducted', 'voluntarily_absent',
  'located_safe', 'recovered_deceased', 'resolved',
]);
const ACTIVE_STATUSES = new Set([
  'missing', 'endangered', 'involuntarily_missing', 'abducted', 'voluntarily_absent',
]);
const VALID_SOURCE_TYPES = new Set([
  'investigating_agency', 'namus', 'ncmec', 'tribal_authority', 'interpol', 'government',
]);
const VALID_PRECISION = new Set(['city', 'county', 'region']);
const VALID_VISIBILITY = new Set(['published', 'draft']);

const fail = (line, message) => {
  throw new Error(`missing-persons.tsv line ${line}: ${message}`);
};

const required = (row, fields, line) => {
  for (const field of fields) if (!row[field]) fail(line, `missing required field "${field}"`);
};

const checkDate = (value, field, line) => {
  if (!DATE_RE.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    fail(line, `${field} must be a real YYYY-MM-DD date`);
  }
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
    fail(line, `${field} must be a valid http(s) URL`);
  }
};

const statusLabel = (status) => ({
  missing: 'Missing',
  endangered: 'Endangered missing',
  involuntarily_missing: 'Involuntarily missing',
  abducted: 'Abducted',
  voluntarily_absent: 'Voluntarily absent',
  located_safe: 'Located safe',
  recovered_deceased: 'Recovered deceased',
  resolved: 'Resolved',
})[status];

export function parseMissingPersons(tsv) {
  const lines = tsv.replace(/^\uFEFF/, '').replace(/\r?\n$/, '').split(/\r?\n/);
  if (lines.length < 2) throw new Error('missing-persons.tsv has no metadata row');
  const headers = lines[0].split('\t');
  if (headers.join('\t') !== COLUMNS.join('\t')) {
    throw new Error(`missing-persons.tsv header must be exactly: ${COLUMNS.join('\t')}`);
  }

  const parsed = [];
  const seenIds = new Set();
  for (let index = 1; index < lines.length; index += 1) {
    if (!lines[index].trim()) continue;
    const line = index + 1;
    const cells = lines[index].split('\t');
    if (cells.length !== COLUMNS.length) fail(line, `expected ${COLUMNS.length} columns, found ${cells.length}`);
    const row = Object.fromEntries(COLUMNS.map((column, i) => [column, cells[i].trim()]));
    if (!VALID_KINDS.has(row.kind)) fail(line, `invalid kind "${row.kind}"`);
    required(row, ['kind', 'id', 'status'], line);
    if (seenIds.has(row.id)) fail(line, `duplicate id "${row.id}"`);
    seenIds.add(row.id);

    if (row.kind === 'meta') {
      if (row.id !== 'last_updated') fail(line, `unknown metadata id "${row.id}"`);
      checkDate(row.status, 'metadata status', line);
      parsed.push({ ...row, line });
      continue;
    }

    if (!ID_RE.test(row.id)) fail(line, 'id must be a lowercase hyphenated slug');
    required(row, [
      'name', 'agency_status', 'approx_location', 'region', 'country', 'latitude', 'longitude',
      'map_precision', 'date_missing', 'investigating_agency', 'verification_date', 'source_type',
      'source_url', 'source_label', 'tip_url', 'tip_label', 'follow_key', 'summary', 'visibility',
    ], line);
    if (!VALID_STATUSES.has(row.status)) fail(line, `invalid status "${row.status}"`);
    if (!VALID_SOURCE_TYPES.has(row.source_type)) fail(line, `invalid source_type "${row.source_type}"`);
    if (!VALID_PRECISION.has(row.map_precision)) fail(line, `invalid map_precision "${row.map_precision}"`);
    if (!VALID_VISIBILITY.has(row.visibility)) fail(line, `invalid visibility "${row.visibility}"`);
    checkDate(row.date_missing, 'date_missing', line);
    checkDate(row.verification_date, 'verification_date', line);
    checkUrl(row.source_url, 'source_url', line);
    checkUrl(row.source2_url, 'source2_url', line);
    checkUrl(row.tip_url, 'tip_url', line);
    checkUrl(row.article_path, 'article_path', line, true);
    checkUrl(row.image_path, 'image_path', line, true);
    if (row.source2_url && !row.source2_label) fail(line, 'source2_label is required when source2_url is present');
    if (row.source2_label && !row.source2_url) fail(line, 'source2_url is required when source2_label is present');

    const latitude = Number(row.latitude);
    const longitude = Number(row.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) fail(line, 'latitude must be between -90 and 90');
    if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) fail(line, 'longitude must be between -180 and 180');
    if (!/^-?\d+(?:\.\d{1,2})?$/.test(row.latitude) || !/^-?\d+(?:\.\d{1,2})?$/.test(row.longitude)) {
      fail(line, 'map coordinates must be approximate and use no more than two decimal places');
    }

    parsed.push({
      ...row,
      line,
      latitude,
      longitude,
      active: ACTIVE_STATUSES.has(row.status),
      statusLabel: statusLabel(row.status),
    });
  }

  const metadata = Object.fromEntries(parsed.filter((row) => row.kind === 'meta').map((row) => [row.id, row.status]));
  if (!metadata.last_updated) throw new Error('missing-persons.tsv requires metadata row "last_updated"');
  const allCases = parsed.filter((row) => row.kind === 'case' && row.visibility === 'published');
  return {
    metadata,
    allCases,
    active: allCases.filter((row) => row.active),
    resolved: allCases.filter((row) => !row.active),
  };
}

export function formatMissingDate(iso) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`));
}

export { COLUMNS, VALID_STATUSES };
