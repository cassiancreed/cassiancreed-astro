import { classifyCalendarLink } from '../data/calendar-explainer-links.mjs';
// Used only by explicit calendar content/signup controls; plain navigation does not call this helper.
// Existing anchor labels, event handlers, targets and analytics attributes stay intact.
export function appendCalendarCostBadge(element, rawLink) {
  const url = rawLink?.url || element.getAttribute('href') || '#court-updates';
  const link = classifyCalendarLink({ ...rawLink, url });
  let badge = element.querySelector(':scope > .calendar-badge');
  if (!badge) {
    badge = element.ownerDocument.createElement('span');
    badge.className = 'calendar-badge';
    element.prepend(badge, element.ownerDocument.createTextNode(' '));
  }
  badge.dataset.linkType = link.type;
  if (badge.textContent !== link.badge) badge.textContent = link.badge;
  if (element.classList.contains('calendar-resource')) element.dataset.linkType = link.type;
  return badge;
}
