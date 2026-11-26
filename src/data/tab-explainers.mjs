// Site fix list v2, item 7 (Nov 25, 2026): a short "what this tab is for" box
// at the top of each main nav tab. Keys are paths without the trailing slash.
// Keep each line short and plain (6th-grade wording). Builder iSWEAT only.
export const TAB_EXPLAINERS = {
  '/start-here': 'New here? This page picks three case files to read first, then points you to the explainers behind them.',
  '/trending': 'The cases people are talking about right now. Each one shows where it is in the news and links to its next court date.',
  '/good-news': 'Cold case wins we have checked: unknown people who got their names back, and old cases that moved forward in court.',
  '/today': 'What changed in the cases we track: court dates, case status and missing-person updates, each with an official source.',
  '/court-calendar': 'Upcoming hearings, trials and sentencings in the cases we follow. Each date shows its source and when we last checked it. Court dates can move.',
  '/watch-guide': 'True crime coming up on TV and streaming, laid out like a TV guide.',
  '/missing-persons': 'A map of some missing-person cases, with each one’s status, the agency in charge and the official way to send a tip.',
  '/genealogy': 'How DNA and family trees help give names back to unknown people, with the cases where it worked.',
  '/case-files': 'Our case files, newest first. Each one shows the record on the day it was written. For today’s court dates, use the Court Calendar.',
  '/guides': 'Everything in one place: free guides, tools, the glossary, the case files and our book.',
  '/glossary': 'Court words in plain English, A to Z. Each one links to a case where it mattered.',
  '/safety': 'Practical safety tips and places to get help. In danger right now? Call 911.',
  '/voir-dire-simulator': 'A practice game about picking a jury. You question pretend jurors and decide who sits. It teaches; it is not legal advice.',
  '/ai-al': 'A.I. AL is how we sort what the record proves from what is still disputed or unknown. This page explains how it works and its limits.',
  '/books': 'Our paid guides: case guides for $1.99 each and the Jury Chess book. You buy and download them on Beehiiv.',
  '/about': 'Who writes this site and how: public records, victims first, and AI help that people check.',
};

export function tabExplainerFor(path) {
  const key = String(path || '/').replace(/\/+$/, '') || '/';
  return TAB_EXPLAINERS[key] ?? null;
}
