// Shared CAL-05 detection, badge words, prices and ordering; no separate styles.
import { classifyCalendarLink, CALENDAR_LINK_TYPES, JURY_CHESS_LINK } from './calendar-explainer-links.mjs';
export { classifyCalendarLink as classifyMediaLink };
export const MEDIA_JURY_CHESS_ENTRY_IDS = new Set();
// Jury Chess only on US criminal jury events. Never civil, foreign, child-victim or juvenile cases. Owner may override per case.
export const MEDIA_JURY_CHESS_EXCLUDED_IDS = new Set(["media-01","media-02","media-03","media-04","media-05","media-06","media-07","media-08","media-09","media-10","media-11","media-12","media-13","media-14","media-15","media-16","media-17","media-18","media-19","media-20","media-21","media-22","media-23","media-24","media-25","media-s1","media-s2","media-s3"]);
const forensic = [
  { url:'/how-forensic-genetic-genealogy-works/', text:'How Forensic Genetic Genealogy Actually Works' },
  { url:'/post/reading-the-crime-scene-what-forensics-reveals/', text:"Reading the Crime Scene: What Forensics Can Reveal — and What It Can't" },
];
const justice = [
  { url:'/post/first-degree-second-degree-manslaughter-what-s-the-difference/', text:"First-Degree, Second-Degree, Manslaughter: What's the Difference?" },
  { url:'/post/how-investigators-weigh-evidence-plain-english/', text:'How Investigators Weigh Evidence: The Hidden Logic of Solving a Crime' },
];
export const MEDIA_EXPLAINER_MATCHES = {
  'media-07': { kind:'topic', reason:'The main subject is forensic breakthroughs; these explain forensic methods and their limits.', links:forensic },
  'media-24': { kind:'topic', reason:'The main subject is the history of US criminal justice; these explain offense levels and evidence.', links:justice },
  'media-25': { kind:'topic', reason:'Part 2 of the same US criminal-justice series; the same topic matches apply.', links:justice },
};
// No same-case published NEP post or priced guide was found in this first list.
// A general series about crime is not a match to an unrelated individual case.
export function mediaLinksFor(row) {
  const links = (MEDIA_EXPLAINER_MATCHES[row.id]?.links || []).map(classifyCalendarLink);
  if (MEDIA_JURY_CHESS_ENTRY_IDS.has(row.id) && !MEDIA_JURY_CHESS_EXCLUDED_IDS.has(row.id)) links.push(classifyCalendarLink({...JURY_CHESS_LINK,placement:'media_calendar_jury_chess'}));
  return links.filter(link => link.type !== 'book' || (MEDIA_JURY_CHESS_ENTRY_IDS.has(row.id) && !MEDIA_JURY_CHESS_EXCLUDED_IDS.has(row.id)))
    .sort((a,b) => CALENDAR_LINK_TYPES.indexOf(a.type) - CALENDAR_LINK_TYPES.indexOf(b.type));
}
export function mediaCourtLink(row, courtEntries) {
  if (!row.court_calendar_id) return null;
  const event = courtEntries.find(entry => entry.id === row.court_calendar_id);
  if (!event) throw new Error('Unknown Court Calendar match: ' + row.court_calendar_id);
  const date = new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(event.dateISO+'T12:00:00Z'));
  return { url:'/court-calendar/#'+event.id, text:'In court: '+date+' → Court Calendar', reason:'Same federal case: Alon, Oren and Tal Alexander; sentencing on '+event.dateISO+'.' };
}
