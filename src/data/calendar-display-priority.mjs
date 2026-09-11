import caseIntelligence from './case-intelligence.json';

// One durable intelligence record now supplies calendar prominence and the
// downstream production packet. The scores remain a provisional editorial
// signal; they are never rendered publicly and never change legal wording.
const DISPLAY_PRIORITY = new Map(Object.entries(caseIntelligence.display_priority_by_event));

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
