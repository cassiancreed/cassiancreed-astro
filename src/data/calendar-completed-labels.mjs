// One place decides the label on a completed court-calendar entry, so the
// court calendar and /today/ can never disagree.
//
// A completed entry is one step in a case. The label may only say the case is
// over when the row's own text says so. Order of checks:
//   1. an exact per-row label;
//   2. the same case still has a dated, unconfirmed or appeal entry on the
//      page, so the case is open;
//   3. the row is on the ended-case allow-list below;
//   4. otherwise the neutral "Step completed", which is always true.
export const COMPLETED_LABEL_BY_ID = new Map([
  ['davis-tupac-openings', 'Sentencing reported'],
  ['vallow-idaho-appeal-argument', 'Argued · no ruling yet'],
]);

// Cases that truly ended, per the row's own text: the case is finished, with
// no pending sentencing, appeal, review or litigation, and no open or
// unverified appeal status. Add a row here only when its text says that.
export const ENDED_CASE_IDS = new Set([
  'clenney-plea', // plea and sentence; the plea resolved the prosecution
  'completed-1', // guilty plea to all counts, life without parole; no court date ahead
  'completed-4', // plea and sentence; appeal waived on the record
  'charles-byrd-sentencing', // plea and sentence; appeal waived; "complete"
  'conahan-execution-completed', // executed
  'long-mcvey-historical', // executed in 2019; historical entry
  'chafin-case-closed', // investigation closed; suspect died; no charges
  'marin-mendoza', // sentence served in full; no appeal, retrial or claim
]);

export const OPEN_CASE_LABEL = 'Past step · case still open';
export const STEP_LABEL = 'Step completed';

// openEntries: the page's dated entries still ahead (or ongoing), plus its
// unconfirmed and appeal entries. endedLabel: the page's word for a case that
// truly ended ("Concluded" on the calendar, "Confirmed outcome" on /today/).
export function completedLabel(entry, openEntries, endedLabel) {
  if (COMPLETED_LABEL_BY_ID.has(entry.id)) return COMPLETED_LABEL_BY_ID.get(entry.id);
  if (openEntries.some((other) => other.case === entry.case)) return OPEN_CASE_LABEL;
  return ENDED_CASE_IDS.has(entry.id) ? endedLabel : STEP_LABEL;
}
