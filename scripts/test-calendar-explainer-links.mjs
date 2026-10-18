import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calendarLinksFor, classifyCalendarLink, calendarLinkTypesFor, juryChessEligible, JURY_CHESS_ENTRY_IDS } from '../src/data/calendar-explainer-links.mjs';
import { parseCourtCalendar } from '../src/data/court-calendar-parser.mjs';
const calendar = parseCourtCalendar(readFileSync(new URL('../src/data/court-calendar.tsv', import.meta.url), 'utf8'));
const entries = [...calendar.entries, ...calendar.appeals, ...calendar.unconfirmed, ...calendar.investigations, ...calendar.completed];

test('classifies destinations with text badges and real catalog prices', () => {
  assert.equal(classifyCalendarLink({url:'/post/example/'}).badge, 'FREE');
  assert.equal(classifyCalendarLink({url:'https://cassiancreed.beehiiv.com/products/case-chess-erin-patterson'}).badge, '$2.99 GUIDE');
  assert.equal(classifyCalendarLink({url:'/books/'}).badge, 'BOOK');
  assert.equal(classifyCalendarLink({url:'https://cassiancreed.beehiiv.com/products/jury-chess'}).type, 'book');
  assert.equal(classifyCalendarLink({url:'https://cassiancreed.beehiiv.com/products/future-guide',price:'$3.99'}).badge, '$3.99 GUIDE');
});
test('all entry links use free, paid, book order and all paid badges carry a catalog price', () => {
  for (const entry of entries) {
    const links = calendarLinksFor(entry);
    const ranks = links.map(l => ['free','paid','book'].indexOf(l.type));
    assert.deepEqual(ranks, [...ranks].sort((a,b)=>a-b), entry.id);
    for (const link of links) {
      assert.ok(link.badge, entry.id);
      if (link.type === 'paid') assert.match(link.badge, /^\$\d+\.\d{2} GUIDE$/);
    }
  }
});
test('reviewed jury phases have exactly one approved Books link, including the existing Banks promo', () => {
  for (const id of JURY_CHESS_ENTRY_IDS) {
    const entry = entries.find(e=>e.id===id);
    assert.ok(entry,id);
    const links = calendarLinksFor(entry).filter(l=>l.bookKey==='jury-chess');
    assert.equal(links.length,1,id);
    assert.equal(links[0].url,'https://cassiancreed.com/books/',id);
    assert.equal(links[0].badge,'BOOK',id);
  }
});
test('new jury events work automatically without linking grand juries or hearing references', () => {
  for (const proceeding of ['Jury trial','Jury selection','Jury verdict','Jury deliberations']) assert.equal(juryChessEligible({proceeding}),true,proceeding);
  for (const proceeding of ['Hearing after mistrial','Post-verdict challenge','Grand-jury date unconfirmed','Motion for new trial','Bench trial','Appeal against a jury verdict','Status hearing — no verdict']) assert.equal(juryChessEligible({proceeding}),false,proceeding);
  assert.equal(calendarLinksFor(entries.find(e=>e.id==='sullivan-jury-trial')).some(l=>l.type==='book'),false);
});
test('day markers aggregate all entries and retain free, paid, book order', () => {
  assert.deepEqual(calendarLinkTypesFor([{explainerLinks:[{type:'book'},{type:'free'}]},{explainerLinks:[{type:'paid'}]}]),['free','paid','book']);
  assert.deepEqual(calendarLinkTypesFor([]),[]);
});
