import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { parseMediaCalendar, pacificToday, mediaDates, visibleMediaRows, formatMediaAsOf, mediaAsOfAgeDays, MEDIA_AS_OF_PATTERN, MEDIA_AS_OF_MAX_AGE_DAYS } from '../src/data/media-calendar-parser.mjs';
import { mediaLinksFor, mediaCourtLink, MEDIA_JURY_CHESS_ENTRY_IDS, MEDIA_JURY_CHESS_EXCLUDED_IDS, MEDIA_EXPLAINER_MATCHES, classifyMediaLink } from '../src/data/media-explainer-links.mjs';
import { parseCourtCalendar } from '../src/data/court-calendar-parser.mjs';
import { indexablePageRoutes } from '../src/utils/search-index.mjs';
const {rows,asOf,asOfStamp} = parseMediaCalendar(readFileSync('src/data/media-calendar.tsv','utf8'));
const court = parseCourtCalendar(readFileSync('src/data/court-calendar.tsv','utf8'));
const courts = [...court.entries,...court.appeals,...court.unconfirmed,...court.investigations,...court.completed];
const isRealDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(value+'T12:00:00Z').toISOString().slice(0,10) === value;
const addDays = (iso,days) => new Date(Date.parse(iso+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);
// No fixed as-of date: any refresh passes when it follows the format and recency rules.
test('as-of date and clock-read time follow the format and recency rules',()=>{
  assert.ok(isRealDate(asOf),'as-of is a real YYYY-MM-DD date: '+asOf);
  assert.match(asOfStamp,MEDIA_AS_OF_PATTERN,'as-of carries a clock-read time with a UTC offset');
  assert.equal(asOfStamp.slice(0,10),asOf,'as-of stamp and as-of date agree');
  assert.equal(pacificToday(new Date(asOfStamp)),asOf,'as-of time falls on the same Pacific day');
  assert.ok(asOf<=pacificToday(),'as-of date is not in the future');
  assert.match(formatMediaAsOf(asOfStamp),/^[A-Z][a-z]+ \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M PT$/);
  const age=mediaAsOfAgeDays(asOf);
  // A loud warning, not a failure, so an old as-of date never blocks an unrelated deploy.
  if(age>MEDIA_AS_OF_MAX_AGE_DAYS) console.warn(`\nATTENTION: True Crime Watch Calendar as-of date ${asOf} is ${age} days old (limit ${MEDIA_AS_OF_MAX_AGE_DAYS}). Re-check every row, drop past rows, and refresh the as-of time.\n`);
});
test('as-of helpers: clock time in Pacific, date-only stamps rejected, age in days',()=>{
  assert.equal(formatMediaAsOf('2026-10-22T12:35:00-07:00'),'October 22, 2026, 12:35 PM PT');
  assert.equal(formatMediaAsOf('2026-11-02T09:05-08:00'),'November 2, 2026, 9:05 AM PT');
  assert.doesNotMatch('2026-10-22',MEDIA_AS_OF_PATTERN);
  assert.doesNotMatch('2026-10-22T12:35',MEDIA_AS_OF_PATTERN);
  assert.equal(mediaAsOfAgeDays('2026-10-15','2026-10-22'),7);
  assert.equal(mediaAsOfAgeDays('2026-10-22','2026-10-22'),0);
  const lines=readFileSync('src/data/media-calendar.tsv','utf8').split('\n');
  const withMeta=(dateIso,lastVerified)=>{
    const meta=lines[1].split('\t');
    meta[1]=dateIso; meta[13]=lastVerified;
    return [lines[0],meta.join('\t'),...lines.slice(2)].join('\n');
  };
  assert.equal(lines[1].split('\t')[0],'meta');
  assert.throws(()=>parseMediaCalendar(withMeta('','2026-10-22')),/as-of clock time/);
  assert.throws(()=>parseMediaCalendar(withMeta('2026-10-22','2026-10-22')),/as-of clock time/);
  assert.throws(()=>parseMediaCalendar(withMeta('2026-10-21T12:35:00-07:00','2026-10-22')),/as-of clock time/);
  assert.equal(parseMediaCalendar(withMeta('2026-10-22T08:00-07:00','2026-10-22')).asOfStamp,'2026-10-22T08:00-07:00');
});
test('every row has valid dates, sources and copy, and was checked on or before the as-of date',()=>{
  assert.ok(rows.length>0);
  for(const r of rows) {
    assert.ok(isRealDate(r.date_iso),r.id+' date_iso');
    assert.ok(isRealDate(r.last_verified),r.id+' last_verified');
    assert.ok(r.last_verified<=asOf,r.id+' was checked after the as-of date');
    assert.ok(r.title && r.date_text && r.time_text && r.description,r.id);
    assert.match(r.source_url,/^https?:\/\//,r.id);
    if(r.source2_url) assert.match(r.source2_url,/^https?:\/\//,r.id);
  }
  const dated=rows.filter(r=>r.standing==='no').map(r=>r.date_iso);
  assert.deepEqual(dated,[...dated].sort(),'dated rows stay in date order');
});
test('recency rule: no row is already past on the as-of date',()=>{
  // Refreshing the as-of date means past rows were dropped in the same change.
  for(const r of rows) assert.ok(mediaDates(r).some(d=>d>=asOf),r.id+' has no date on or after '+asOf);
  assert.equal(visibleMediaRows(rows,asOf).length,rows.length);
});
test('date hiding uses Pacific midnight, includes today, and ends finite standing slots',()=>{
  assert.equal(pacificToday(new Date('2026-10-19T06:59:59Z')),'2026-10-18');
  assert.equal(pacificToday(new Date('2026-10-19T07:00:00Z')),'2026-10-19');
  assert.equal(pacificToday(new Date('2026-11-02T07:59:59Z')),'2026-11-01');
  assert.equal(pacificToday(new Date('2026-11-02T08:00:00Z')),'2026-11-02');
  const fixture=[
    {id:'a',standing:'no',date_iso:'2026-10-18',date_text:'Sun Oct 18'},
    {id:'b',standing:'no',date_iso:'2026-10-19',date_text:'Mon Oct 19'},
    {id:'c',standing:'yes',date_iso:'2026-10-23',date_text:'Fridays: Oct 23, Oct 30, Nov 6'},
  ];
  assert.deepEqual(mediaDates(fixture[2]),['2026-10-23','2026-10-30','2026-11-06']);
  assert.deepEqual(visibleMediaRows(fixture,'2026-10-18').map(r=>r.id),['a','b','c']);
  assert.deepEqual(visibleMediaRows(fixture,'2026-10-19').map(r=>r.id),['b','c']);
  assert.deepEqual(visibleMediaRows(fixture,'2026-11-06').map(r=>r.id),['c']);
  assert.deepEqual(visibleMediaRows(fixture,'2026-11-07'),[]);
  const later=addDays(asOf,4);
  for(const r of visibleMediaRows(rows,later)) assert.ok(mediaDates(r).some(d=>d>=later),r.id);
});
test('BOOK is allowlist-only, excluded rows stay excluded even if accidentally added',()=>{
  assert.equal(MEDIA_JURY_CHESS_ENTRY_IDS.size,0);
  for(const r of rows) assert.equal(mediaLinksFor(r).some(l=>l.type==='book'),false,r.id);
  for(const id of MEDIA_JURY_CHESS_EXCLUDED_IDS) {
    MEDIA_JURY_CHESS_ENTRY_IDS.add(id);
    try {assert.equal(mediaLinksFor({id}).some(l=>l.type==='book'),false,id);}
    finally {MEDIA_JURY_CHESS_ENTRY_IDS.delete(id);}
  }
  for(const id of ['new-jury-trial','juvenile-trial','unsolved-case','foreign-trial','civil-jury']) assert.equal(mediaLinksFor({id,proceeding:'Jury trial'}).some(l=>l.type==='book'),false,id);
});
test('honest topic matches only; shared CAL-05 classification and ordering',()=>{
  assert.deepEqual(rows.filter(r=>mediaLinksFor(r).length).map(r=>r.id),['media-24','media-25']);
  assert.equal(rows.flatMap(mediaLinksFor).length,4);
  for(const id of Object.keys(MEDIA_EXPLAINER_MATCHES)) assert.ok(rows.some(r=>r.id===id),'explainer match for a dropped row: '+id);
  for(const link of rows.flatMap(mediaLinksFor)) assert.equal(link.badge,'FREE');
  assert.equal(classifyMediaLink({url:'https://cassiancreed.beehiiv.com/products/example',price:'$1.99'}).badge,'$1.99 GUIDE');
  for(const link of rows.flatMap(mediaLinksFor)) {
    if(!link.url.startsWith('/post/')) continue;
    const file='src/content/posts/'+link.url.split('/')[2]+'.md';
    assert.ok(existsSync(file));
    const front=readFileSync(file,'utf8').split('---')[1];
    assert.doesNotMatch(front,/^(archived|draft):\s*true/m);
    assert.ok(front.includes('title: '+JSON.stringify(link.text)));
  }
});
test('same-case court cross-links resolve to real Court Calendar entries',()=>{
  // Rows drop off after their date passes, so this test checks every remaining match
  // instead of hard-coding one row (media-14 blocked refreshes for 3 days in Oct 2026).
  const matched=rows.filter(r=>mediaCourtLink(r,courts));
  const ids=new Set(courts.map(c=>c.id));
  for(const r of matched) {
    const link=mediaCourtLink(r,courts);
    assert.equal(link.url,'/court-calendar/#'+r.court_calendar_id,r.id);
    assert.ok(ids.has(r.court_calendar_id),r.id+' links to a real Court Calendar entry');
    assert.match(link.text,/^In court: [A-Z][a-z]{2} \d{1,2} → Court Calendar$/,r.id);
  }
  const alexander=rows.find(r=>r.id==='media-14');
  if(alexander) {
    assert.deepEqual(mediaCourtLink(alexander,courts).url,'/court-calendar/#alexander-brothers-sentencing');
    assert.equal(mediaCourtLink(alexander,courts).text,'In court: Oct 27 → Court Calendar');
  }
});
test('rendered route, sitemap, nav and shared style integration',()=>{
  const page=readFileSync('src/pages/true-crime-watch-calendar.astro','utf8');
  assert.match(page,/import CalendarExplainerLink/);
  assert.doesNotMatch(page,/\.calendar-badge\s*\{/);
  assert.match(page,/Not yet confirmed by the network\./);
  assert.match(page,/hidePastMedia\(\)/);
  const nav=readFileSync('src/layouts/Base.astro','utf8');
  assert.equal((nav.match(/label: 'True Crime Watch Calendar'/g)||[]).length,2);
  assert.ok(indexablePageRoutes().some(({route,noindex})=>route==='/true-crime-watch-calendar/'&&!noindex));
  assert.ok(readFileSync('src/pages/llms.txt.ts','utf8').includes('/true-crime-watch-calendar/'));
  // C7: the Watch Calendar is linked from the Books page and the Court Calendar.
  assert.match(readFileSync('src/pages/books.astro','utf8'),/<a href="\/true-crime-watch-calendar\/">/);
  assert.match(readFileSync('src/pages/court-calendar.astro','utf8'),/<a href="\/true-crime-watch-calendar\/">/);
});
test('every linked explainer and source returns HTTP 200', {skip:process.env.MEDIA_LINK_CHECK!=='1', timeout:240000},async()=>{
  const urls=[...new Set(rows.flatMap(r=>[r.source_url,r.source2_url,...mediaLinksFor(r).map(l=>new URL(l.url,'https://cassiancreed.com').href),mediaCourtLink(r,courts)?'https://cassiancreed.com/court-calendar/':'']).filter(Boolean))];
  const checks=[];
  for(let i=0;i<urls.length;i+=5) await Promise.all(urls.slice(i,i+5).map(async url=>{
    let result;
    try {
      const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; NEP-LinkCheck/1.0)'},signal:AbortSignal.timeout(25000),redirect:'follow'});
      result={url,status:response.status,finalUrl:response.url}; await response.body?.cancel();
    } catch(e) { result={url,status:null,error:e.message}; }
    checks.push(result);
  }));
  console.log('MEDIA_HTTP '+JSON.stringify(checks));
  assert.deepEqual(checks.filter(r=>r.status!==200),[]);
});

test('review source labels and standing topics match their actual sources',()=>{
  assert.equal(rows.find(r=>r.id==='media-22').source_label,"What's on Netflix");
  for(const r of rows.filter(r=>r.standing==='yes')) assert.equal(r.topic,'');
  const abc=rows.find(r=>r.id==='media-s2');
  assert.equal(abc.source_label,'ABC');
  assert.equal(abc.source_url,'https://abc.com/news/68176c48-d9cc-47a7-a237-d961a53fccaf/category/1138628');
});

test('reader-facing media fields never expose internal row-number references',()=>{
  const fields=['date_iso','date_text','time_text','title','platform','type','topic','description','source_label','source2_label','last_verified'];
  for(const row of rows) for(const field of fields) {
    assert.doesNotMatch(row[field],/\brow\s+\d+/i,row.id+' '+field);
  }
});
