import test from 'node:test';
import { JURY_CHESS_PRICE_TEXT } from '../src/data/book-prices.mjs';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calendarLinksFor, classifyCalendarLink, calendarLinkTypesFor, juryChessEligible, JURY_CHESS_ENTRY_IDS, JURY_CHESS_EXCLUDED_IDS } from '../src/data/calendar-explainer-links.mjs';
import { parseCourtCalendar } from '../src/data/court-calendar-parser.mjs';
const calendar = parseCourtCalendar(readFileSync(new URL('../src/data/court-calendar.tsv', import.meta.url), 'utf8'));
const entries = [...calendar.entries, ...calendar.appeals, ...calendar.unconfirmed, ...calendar.investigations, ...calendar.completed];

test('classifies destinations with text badges and real catalog prices', () => {
  assert.equal(classifyCalendarLink({url:'/post/example/'}).badge, 'FREE');
  assert.equal(classifyCalendarLink({url:'https://cassiancreed.beehiiv.com/products/case-chess-erin-patterson'}).badge, '$1.99 GUIDE');
  assert.equal(classifyCalendarLink({url:'/books/'}).badge, 'BOOK ' + JURY_CHESS_PRICE_TEXT);
  assert.equal(classifyCalendarLink({url:'https://cassiancreed.beehiiv.com/products/jury-chess-authority-edition-v3-2'}).type, 'book');
  assert.equal(classifyCalendarLink({url:'https://cassiancreed.beehiiv.com/products/future-guide',price:'$3.99'}).badge, '$3.99 GUIDE');
});
test('all entry links use free, paid, book order and all paid badges carry a catalog price', () => {
  for (const entry of entries) {
    const links = calendarLinksFor(entry);
    // A FREE page-1 preview is attached to its paid guide, so it ranks with paid.
    const ranks = links.map(l => l.preview ? 1 : ['free','paid','book'].indexOf(l.type));
    links.forEach((l, i) => { if (l.preview) assert.equal(links[i-1]?.bookKey, l.previewFor, entry.id + ' preview follows its paid guide'); });
    assert.deepEqual(ranks, [...ranks].sort((a,b)=>a-b), entry.id);
    for (const link of links) {
      assert.ok(link.badge, entry.id);
      if (link.type === 'paid') assert.match(link.badge, /^\$\d+\.\d{2} GUIDE$/);
    }
  }
});
test('reviewed jury phases have exactly one approved Books link', () => {
  for (const id of JURY_CHESS_ENTRY_IDS) {
    const entry = entries.find(e=>e.id===id);
    assert.ok(entry,id);
    const links = calendarLinksFor(entry).filter(l=>l.bookKey==='jury-chess');
    assert.equal(links.length,1,id);
    assert.equal(links[0].url,'https://cassiancreed.com/books/',id);
    assert.equal(links[0].badge,'BOOK ' + JURY_CHESS_PRICE_TEXT,id);
  }
});
test('unreviewed jury events never receive BOOK links', () => {
  for (const proceeding of ['Jury trial','Jury selection','Jury verdict','Jury deliberations']) {
    const entry = {id: 'new-unreviewed-jury-event', proceeding};
    assert.equal(juryChessEligible(entry), false, proceeding);
    assert.equal(calendarLinksFor(entry).some(link => link.type === 'book'), false, proceeding);
    assert.equal(calendarLinksFor({...entry,link:'/books/',linkText:'Get Jury Chess'}).some(link => link.type === 'book'), false, 'Books URL cannot bypass allowlist');
  }
  for (const entry of entries) {
    assert.equal(calendarLinksFor(entry).some(link => link.type === 'book'), JURY_CHESS_ENTRY_IDS.has(entry.id), entry.id);
  }
});
test('day markers aggregate all entries and retain free, paid, book order', () => {
  assert.deepEqual(calendarLinkTypesFor([{explainerLinks:[{type:'book'},{type:'free'}]},{explainerLinks:[{type:'paid'}]}]),['free','paid','book']);
  assert.deepEqual(calendarLinkTypesFor([]),[]);
});

test('review exclusions never receive BOOK links, even when their event is a jury trial', () => {
  assert.deepEqual([...JURY_CHESS_EXCLUDED_IDS], ["goncalves-wsu-trial","aramburu-paris-trial","kepner-federal-trial","brianna-moore-trial","clancy-trial","virzi-trial","michael-vaughan-trial","crum-odom-verdict","preston-lord-meisner-trial","preston-lord-five-defendant-trial","elmore-laura-miller-trial","wagner-trial","gardner-jury-selection","gardner-trial","bridegan-fernandez-trial","farwell-jury-trial","farwell-trial-oct19","carter-brooks-trial","ryan-cavett-trial","killins-verdict-sentencing","eaton-burlington-trial","banks-federal-trial","conway-mo3-trial"]);
  for (const id of JURY_CHESS_EXCLUDED_IDS) {
    const entry = entries.find(e => e.id === id);
    assert.ok(entry, id);
    assert.equal(JURY_CHESS_ENTRY_IDS.has(id), false, id);
    assert.equal(juryChessEligible({...entry, proceeding: 'Jury trial'}), false, id);
    assert.equal(calendarLinksFor(entry).some(link => link.type === 'book'), false, id);
    assert.equal(calendarLinksFor({...entry,link:'/books/',linkText:'Get Jury Chess'}).some(link => link.type === 'book'), false, id+' explicit Books link');
  }
  for (const proceeding of ['Civil jury trial', 'Assize jury trial', 'Tribunal jury trial', 'Cour d’assises jury trial']) {
    assert.equal(juryChessEligible({proceeding}), false, proceeding);
  }
});

test('paid and Books destinations cannot be overridden as FREE and always need real prices',()=>{
  for(const url of ['https://cassiancreed.beehiiv.com/products/jury-chess-authority-edition-v3-2','/books/','/books/jury-chess/','https://cassiancreed.com/books/#jury-chess']) {
    assert.equal(classifyCalendarLink({url,type:'free'}).badge,'BOOK '+JURY_CHESS_PRICE_TEXT,url);
  }
  assert.equal(classifyCalendarLink({url:'https://cassiancreed.beehiiv.com/products/future-guide',type:'free',price:'$1.99'}).badge,'$1.99 GUIDE');
  assert.throws(()=>classifyCalendarLink({url:'https://cassiancreed.beehiiv.com/products/unpriced-guide',type:'free'}),/Missing verified calendar product price/);
  for(const entry of entries) for(const link of calendarLinksFor(entry)) {
    if(link.type==='paid') assert.match(link.badge,/^\$\d+\.\d{2} GUIDE$/);
    if(link.type==='book') assert.equal(link.badge,'BOOK '+JURY_CHESS_PRICE_TEXT);
  }
});

test('living-survivor cases stay outside the eight-entry BOOK allowlist',()=>{
  assert.equal(JURY_CHESS_ENTRY_IDS.size,8);
  for(const id of ['killins-verdict-sentencing','eaton-burlington-trial','banks-federal-trial','conway-mo3-trial']) {
    const entry=entries.find(e=>e.id===id);assert.ok(entry,id);
    assert.equal(JURY_CHESS_ENTRY_IDS.has(id),false,id);
    assert.equal(JURY_CHESS_EXCLUDED_IDS.has(id),true,id);
    assert.equal(juryChessEligible({...entry,proceeding:'Jury trial'}),false,id);
    assert.equal(calendarLinksFor(entry).some(link=>link.type==='book'),false,id);
    assert.equal(calendarLinksFor({...entry,link:'/books/',linkText:'Get Jury Chess'}).some(link=>link.type==='book'),false,id+' explicit Books link');
  }
});

test('Banks has no stale case-specific Jury Chess promotion if its exclusions change',()=>{
  const allowed=[...JURY_CHESS_ENTRY_IDS],excluded=[...JURY_CHESS_EXCLUDED_IDS];
  const entry=entries.find(e=>e.id==='banks-federal-trial');assert.ok(entry);
  try {
    JURY_CHESS_EXCLUDED_IDS.delete(entry.id);
    JURY_CHESS_ENTRY_IDS.add(entry.id);
    const books=calendarLinksFor(entry).filter(link=>link.type==='book');
    assert.equal(books.length,1);
    assert.equal(books[0].url,'https://cassiancreed.com/books/');
    assert.equal(books[0].placement,'court_calendar_jury_chess');
    assert.equal(books[0].text,'Get Jury Chess');
  } finally {
    JURY_CHESS_ENTRY_IDS.clear();for(const id of allowed)JURY_CHESS_ENTRY_IDS.add(id);
    JURY_CHESS_EXCLUDED_IDS.clear();for(const id of excluded)JURY_CHESS_EXCLUDED_IDS.add(id);
  }
});
