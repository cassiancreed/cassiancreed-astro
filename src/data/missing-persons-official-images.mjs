// Official photos and age progressions for /missing-persons/.
// Rule (owner, 2026-11-26): show only images an official source released,
// labeled with that source. NEP never makes its own age progression.
// Each image must come from the same official host as the person's record,
// and the file must be saved under /missing-persons/official/.
const HEADERS = ['id', 'kind', 'image_path', 'age_shown', 'source_label', 'source_url', 'released'];
const KINDS = new Set(['photo', 'age_progression']);
const PATH_RE = /^\/missing-persons\/official\/[a-z0-9-]+\.(?:jpg|jpeg|png|webp)$/;

const fail = (message) => {
  throw new Error(`missing-person official image: ${message}`);
};

const hostOf = (value) => {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return '';
    return url.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

export function parseOfficialImages(tsv) {
  const lines = tsv.replace(/^﻿/, '').replace(/\r?\n$/, '').split(/\r?\n/);
  const headers = lines[0]?.split('\t') ?? [];
  if (headers.join('\t') !== HEADERS.join('\t')) fail(`header must be exactly: ${HEADERS.join('\t')}`);
  const seen = new Set();
  return lines.slice(1).filter((line) => line.trim()).map((line, index) => {
    const lineNumber = index + 2;
    const cells = line.split('\t');
    if (cells.length !== HEADERS.length) fail(`line ${lineNumber}: expected ${HEADERS.length} columns, found ${cells.length}`);
    const row = Object.fromEntries(HEADERS.map((header, i) => [header, cells[i].trim()]));
    if (!KINDS.has(row.kind)) fail(`line ${lineNumber}: kind must be photo or age_progression`);
    if (!PATH_RE.test(row.image_path)) fail(`line ${lineNumber}: image_path must be a file under /missing-persons/official/`);
    if (!row.source_label) fail(`line ${lineNumber}: source_label is required`);
    if (!hostOf(row.source_url)) fail(`line ${lineNumber}: source_url must be an https link to the official release`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.released)) fail(`line ${lineNumber}: released must be YYYY-MM-DD`);
    if (row.kind === 'age_progression' && !/^\d{1,3}$/.test(row.age_shown)) {
      fail(`line ${lineNumber}: an age progression must give the age it shows`);
    }
    const key = `${row.id}:${row.kind}`;
    if (seen.has(key)) fail(`line ${lineNumber}: duplicate ${row.kind} for "${row.id}"`);
    seen.add(key);
    return row;
  });
}

// Every image must belong to a case and come from that case's own official record host.
export function validateOfficialImages(images, cases) {
  const byId = new Map(cases.map((entry) => [entry.id, entry]));
  for (const image of images) {
    const entry = byId.get(image.id);
    if (!entry) fail(`"${image.id}" is not a case in missing-persons.tsv`);
    const allowed = new Set([hostOf(entry.source_url), hostOf(entry.source2_url)].filter(Boolean));
    if (!allowed.has(hostOf(image.source_url))) {
      fail(`"${image.id}" ${image.kind} must come from the same official site as the case record (${[...allowed].join(', ')})`);
    }
  }
  return images;
}

export function officialImagesById(images) {
  const map = new Map();
  for (const image of images) {
    const current = map.get(image.id) ?? {};
    current[image.kind] = image;
    map.set(image.id, current);
  }
  return map;
}

export { HEADERS as OFFICIAL_IMAGE_HEADERS };
