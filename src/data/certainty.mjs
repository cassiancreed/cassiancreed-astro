// Certainty level for a calendar entry, from the existing source tier (RB 1520, Nov 21, 2026).
// confirmed = 3+ sources or an official court record; reported = 2 sources; unconfirmed = 1 source.
// Calendar rows hold at most two sources, so only an official court record can reach Confirmed.
const COURT_RECORD = /clerk docket|court docket|court record|official court|court order|court opinion|court schedule|court listing|court list|court case page|county court portal|appellate court docket|filed hearing notice/i;

export function certaintyFor(entry) {
  const type = entry?.srcType || '';
  const tier = entry?.sourceTier;
  if (COURT_RECORD.test(type) && !/reporting|news/i.test(type)) return 'confirmed';
  if (tier === 'confirmed') return 'reported';
  return 'unconfirmed';
}
