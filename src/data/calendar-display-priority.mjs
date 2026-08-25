// Provisional baseline derived from NEP_Court_Calendar_Intake_2026-08-22_v1.tsv
// Demand_Order using score = 102 - (2 * Demand_Order). Replace these values when
// the scan supplies worldwide commercial demand: audience volume and momentum
// adjusted for geographic purchasing power and purchase intent. Do not treat a
// US-only attention ranking as worldwide demand. All proceedings remain available
// in the agenda; this score controls only limited month-grid prominence.
const DISPLAY_PRIORITY = new Map([
  ['clancy-trial', 100],
  ['bridegan-fernandez-trial', 98],
  ['davis-tupac-openings', 96],
  ['salazar-clinkunbroomer-trial', 94],
  ['robinson-bindover-argument', 92],
  ['crum-odom-verdict', 90],
  ['peters-berger-resolution', 88],
  ['bohm-pretrial-motions', 76],
  ['bohm-trial', 76],
  ['sykes-preliminary-setting', 68],
  ['masud-lockerbie-status', 64],
  ['clancy-closings-tentative', 100],
  ['mangione-state-double-jeopardy-hearing', 98],
  ['mangione-federal-sentencing', 98],
  ['anthony-new-trial', 96],
  ['banks-federal-trial', 94],
  ['burke-prelim', 92],
  ['horsch-federal-trial', 90],
  ['inv-alisa-goods', 88],
  ['gardner-jury-selection', 84],
  ['gardner-trial', 84],
  ['unconfirmed-6', 82],
  ['oreilly-melbourne', 72],
  ['inv-nancy-guthrie', 68],
  ['turner-dore', 64],
  ['unconfirmed-3', 44],
  ['patterson-appeal', 30],
  ['pike-execution', 28],
  ['alexander-brothers-sentencing', 12],
  ['gregg-appeal-decision', 8],
]);

export const calendarDisplayPriority = (entry) => DISPLAY_PRIORITY.get(entry.id) ?? 0;

export const rankByTrend = (entries) => [...entries].sort((a, b) => {
  const trendOrder = calendarDisplayPriority(b) - calendarDisplayPriority(a);
  if (trendOrder) return trendOrder;
  return a.case.localeCompare(b.case);
});

export const rankCalendarEntries = (entries) => [...entries].sort((a, b) => {
  const dateOrder = a.dateISO.localeCompare(b.dateISO);
  if (dateOrder) return dateOrder;
  const trendOrder = calendarDisplayPriority(b) - calendarDisplayPriority(a);
  if (trendOrder) return trendOrder;
  return a.case.localeCompare(b.case);
});
