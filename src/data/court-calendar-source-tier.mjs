// Source-count labels for court-calendar rows. Owner decision RB-022
// (November 17, 2026). Derived from the recorded source fields. There is no
// tier column: a later edit of the sources changes the label on the next build.
//
// Tiers:
//   confirmed        — two or more independent non-social sources. No label.
//   official-single  — one official publisher (court docket, prosecutor, DOJ,
//                      court press release, or a police, state police, sheriff,
//                      prison/corrections, or laboratory release). Label:
//                      "1 source, official". A news report about an agency is
//                      still news.
//   news-single      — one news publisher. Label: "Unconfirmed, 1 source".
//   news-double      — two news reports from different named outlets that share one
//                      host (for example two outlets syndicated on AOL), so their
//                      independence is not proven. Label: "2 news sources".
//   social-only      — every recorded source is an X or Reddit post. Not a
//                      calendar row.
//   unclassified     — the recorded sources do not clearly earn a tier. No
//                      label is applied.

export const OFFICIAL_SINGLE_LABEL = '1 source, official';
export const NEWS_SINGLE_LABEL = 'Unconfirmed, 1 source';
export const NEWS_DOUBLE_LABEL = '2 news sources';

const OFFICIAL_TYPE = /prosecutor|court press release|clerk docket|filed hearing notice|county court portal|official court|appellate court docket|court docket|court record|court listing|court order|court schedule|court opinion|court list|court case page/i;
const NEWS_TYPE = /reporting|news report|news coverage|named outlet|named local outlet/i;

const hostname = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return ''; }
};

const publisherKey = (url) => {
  const host = hostname(url);
  if (host === 'courtlistener.com' || host.endsWith('.courtlistener.com')) return 'courtlistener.com';
  return host;
};

const isSocialSource = (source) => {
  const host = hostname(source.url);
  if (/(^|\.)((?:x|twitter|reddit)\.com)$/.test(host)) return true;
  const text = `${source.type || ''} ${source.label || ''} ${source.url || ''}`;
  return /\b(?:twitter\.com|x\.com|reddit\.com)\b/i.test(text) || /\b(?:post|posted) on (?:x|reddit|twitter)\b/i.test(text);
};

const isDoj = (source) => {
  const host = hostname(source.url);
  if (host === 'justice.gov' || host.endsWith('.justice.gov')) return true;
  if (NEWS_TYPE.test(source.type || '')) return false;
  return /\b(department of justice|u\.s\. attorney(?:'s)? office|united states attorney)\b/i.test(source.label || '');
};

const isCourtPressRelease = (source) => {
  const text = `${source.type || ''} ${source.label || ''}`;
  if (!/\bpress release\b/i.test(text)) return false;
  return /\b(court|judiciary|judicial branch|trial chamber)\b/i.test(text);
};

// Voice XO, November 17, 2026: these agency releases are official. A news
// source type never qualifies, even when the story describes a police release.
const isAgencyRelease = (source) => {
  if (NEWS_TYPE.test(source.type || '')) return false;
  const text = `${source.type || ''} ${source.label || ''} ${hostname(source.url)}`;
  return /\b(police|sheriff|state patrol|troopers|corrections|correctional|department of criminal justice|prison|forensic laboratory|laboratory)\b/i.test(text);
};

export const isClearlyOfficialSource = (source) => {
  const type = source.type || '';
  if (NEWS_TYPE.test(type) && OFFICIAL_TYPE.test(type)) return false;
  if (OFFICIAL_TYPE.test(type)) return true;
  if (isDoj(source)) return true;
  if (!NEWS_TYPE.test(type) && /\b(district attorney|state attorney|prosecutors?(?:'s)? office|attorney general)\b/i.test(source.label || '')) return true;
  if (isCourtPressRelease(source)) return true;
  if (isAgencyRelease(source)) return true;
  return false;
};

const isClearlyNewsSource = (source) => {
  if (isClearlyOfficialSource(source)) return false;
  if (source.type && NEWS_TYPE.test(source.type)) return true;
  if (!source.type && /\b(news|reporting|reported|associated press|court tv)\b/i.test(source.label || '')) return true;
  return false;
};

const leadingName = (label) => (label || '').split(/[,—–]| - /)[0].trim().toLowerCase().replace(/\s+/g, ' ');

// Two pages on one host usually are one publisher. When both labels name
// different news outlets, independence is not clear, so the row stays unlabeled.
const sameHostNewsConflict = (sources) => {
  if (sources.length < 2) return false;
  if (sources.some((source) => isClearlyOfficialSource(source))) return false;
  const names = sources.map((source) => leadingName(source.label)).filter(Boolean);
  return new Set(names).size >= 2;
};

const labeled = (tier) => {
  if (tier === 'official-single') return { tier, label: OFFICIAL_SINGLE_LABEL };
  if (tier === 'news-single') return { tier, label: NEWS_SINGLE_LABEL };
  if (tier === 'news-double') return { tier, label: NEWS_DOUBLE_LABEL };
  return { tier, label: null };
};

export function classifyCourtCalendarSources({
  sourceUrl = '',
  sourceType = '',
  sourceLabel = '',
  source2Url = '',
  source2Label = '',
} = {}) {
  const all = [];
  if (sourceUrl) all.push({ url: sourceUrl, type: sourceType || '', label: sourceLabel || '' });
  if (source2Url) all.push({ url: source2Url, type: '', label: source2Label || '' });
  if (!all.length) return labeled('unclassified');

  const confirming = all.filter((source) => !isSocialSource(source));
  if (!confirming.length) return labeled('social-only');

  const publishers = new Set(confirming.map((source) => publisherKey(source.url)).filter(Boolean));
  if (publishers.size >= 2) return labeled('confirmed');
  const primary = confirming.find((source) => source.type) || confirming[0];
  if (sameHostNewsConflict(confirming)) return labeled(isClearlyNewsSource(primary) ? 'news-double' : 'unclassified');
  if (isClearlyOfficialSource(primary)) return labeled('official-single');
  if (isClearlyNewsSource(primary)) return labeled('news-single');
  return labeled('unclassified');
}
