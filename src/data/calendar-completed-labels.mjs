// One place decides the label on a completed court-calendar entry, so the
// court calendar and /today/ can never disagree.
//
// A completed entry is one step in a case. If the same case still has a court
// date ahead, the case is not over, so the label must not call it concluded or
// an outcome. Per-row labels below are for steps that need exact wording.
export const COMPLETED_LABEL_BY_ID = new Map([
  ['davis-tupac-openings', 'Sentencing reported'],
  ['vallow-idaho-appeal-argument', 'Argued · no ruling yet'],
]);

export const OPEN_CASE_LABEL = 'Past step · case still open';

// upcomingEntries: the scheduled entries still ahead (or ongoing) on the page.
// fallback: the page's own label for a completed entry in a case that ended.
export function completedLabel(entry, upcomingEntries, fallback) {
  return COMPLETED_LABEL_BY_ID.get(entry.id)
    || (upcomingEntries.some((next) => next.case === entry.case) ? OPEN_CASE_LABEL : fallback);
}
