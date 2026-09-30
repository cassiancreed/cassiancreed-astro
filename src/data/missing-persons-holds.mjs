const HEADERS = [
  'id', 'name', 'disposition', 'required_visibility', 'source_url', 'canceled_asset',
  'verification_date', 'reason',
];
const ACTIVE_STATUSES = new Set([
  'missing', 'endangered', 'involuntarily_missing', 'abducted', 'voluntarily_absent',
]);
const CANCELED_EVIDENCE_RE = /(?:cancel(?:ed|led)?|withdrawn)/i;

const fail = (message) => {
  throw new Error(`missing-person publication hold: ${message}`);
};

export function parseMissingPersonHolds(tsv) {
  const lines = tsv.replace(/^\uFEFF/, '').replace(/\r?\n$/, '').split(/\r?\n/);
  const headers = lines[0]?.split('\t') ?? [];
  if (headers.join('\t') !== HEADERS.join('\t')) fail(`header must be exactly: ${HEADERS.join('\t')}`);

  const seen = new Set();
  return lines.slice(1).filter((line) => line.trim()).map((line, index) => {
    const lineNumber = index + 2;
    const cells = line.split('\t');
    if (cells.length !== HEADERS.length) fail(`line ${lineNumber}: expected ${HEADERS.length} columns, found ${cells.length}`);
    const hold = Object.fromEntries(HEADERS.map((header, cellIndex) => [header, cells[cellIndex].trim()]));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(hold.id)) fail(`line ${lineNumber}: invalid id "${hold.id}"`);
    if (seen.has(hold.id)) fail(`line ${lineNumber}: duplicate id "${hold.id}"`);
    seen.add(hold.id);
    if (hold.disposition !== 'UNKNOWN') fail(`line ${lineNumber}: disposition must remain UNKNOWN`);
    if (hold.required_visibility !== 'draft') fail(`line ${lineNumber}: required_visibility must be draft`);
    if (!CANCELED_EVIDENCE_RE.test(hold.canceled_asset)) fail(`line ${lineNumber}: canceled_asset must identify canceled evidence`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(hold.verification_date)) fail(`line ${lineNumber}: invalid verification_date`);
    try {
      const source = new URL(hold.source_url);
      if (!['http:', 'https:'].includes(source.protocol)) throw new Error();
    } catch {
      fail(`line ${lineNumber}: invalid source_url`);
    }
    return hold;
  });
}

export function validateMissingPersonPublicationHolds(cases, holds) {
  const holdsById = new Map(holds.map((hold) => [hold.id, hold]));

  for (const row of cases) {
    const evidenceText = [row.agency_status, row.source_label, row.source2_label, row.summary, row.image_path].join(' ');
    const hasUnresolvedDisposition = /\bUNKNOWN\b/i.test(row.agency_status) || /disposition pending agency confirmation/i.test(row.agency_status);
    const hasCanceledEvidence = CANCELED_EVIDENCE_RE.test(evidenceText) && hasUnresolvedDisposition;
    const hold = holdsById.get(row.id);

    if ((hold || hasCanceledEvidence) && row.visibility !== 'draft') {
      fail(`${row.id} has canceled or withdrawn source evidence and must be held as draft`);
    }
    if ((hold || hasCanceledEvidence) && !ACTIVE_STATUSES.has(row.status)) {
      fail(`${row.id} cannot receive a resolved disposition from cancellation or withdrawal evidence`);
    }
    if (hold && !/\bUNKNOWN\b/i.test(row.agency_status) && !/disposition pending agency confirmation/i.test(row.agency_status)) {
      fail(`${row.id} must state that disposition is UNKNOWN or pending agency confirmation while held`);
    }
  }
}

export { CANCELED_EVIDENCE_RE };
