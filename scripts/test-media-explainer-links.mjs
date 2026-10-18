import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import { parseMediaCalendar, pacificToday, mediaDates, visibleMediaRows } from '../src/data/media-calendar-parser.mjs';
import { mediaLinksFor, mediaCourtLink, MEDIA_JURY_CHESS_ENTRY_IDS, MEDIA_JURY_CHESS_EXCLUDED_IDS, classifyMediaLink } from '../src/data/media-explainer-links.mjs';
import { parseCourtCalendar } from '../src/data/court-calendar-parser.mjs';
const {rows,asOf} = parseMediaCalendar(readFileSync('src/data/media-calendar.tsv','utf8'));
const court = parseCourtCalendar(readFileSync('src/data/court-calendar.tsv','utf8'));
const courts = [...court.entries,...court.appeals,...court.unconfirmed,...court.investigations,...court.completed];
test('complete schedule has valid dates, sources and a fixed as-of date',()=>{
  assert.equal(rows.length,28); assert.equal(rows.filter(r=>r.standing==='yes').length,3);
  assert.equal(asOf,'2026-10-17');
  assert.equal(rows[0].date_iso,'2026-10-18');
  assert.equal(rows[24].date_iso,'2026-11-17');
  for(const r of rows) {
    assert.equal(r.last_verified,'2026-10-17');
    assert.ok(r.title && r.date_text && r.time_text && r.description);
    assert.match(r.source_url,/^https?:\/\//);
  }
});
test('date hiding uses Pacific midnight, includes today, and ends finite standing slots',()=>{
  assert.equal(pacificToday(new Date('2026-10-19T06:59:59Z')),'2026-10-18');
  assert.equal(pacificToday(new Date('2026-10-19T07:00:00Z')),'2026-10-19');
  assert.equal(pacificToday(new Date('2026-11-02T07:59:59Z')),'2026-11-01');
  assert.equal(pacificToday(new Date('2026-11-02T08:00:00Z')),'2026-11-02');
  assert.equal(visibleMediaRows(rows,'2026-10-18').length,28);
  assert.equal(visibleMediaRows(rows,'2026-10-19').length,23);
  assert.equal(visibleMediaRows(rows,'2026-11-15').length,2);
  assert.equal(visibleMediaRows(rows,'2026-11-18').length,0);
  for(const r of visibleMediaRows(rows,'2026-10-26')) assert.ok(mediaDates(r).some(d=>d>='2026-10-26'));
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
  assert.deepEqual(rows.filter(r=>mediaLinksFor(r).length).map(r=>r.id),['media-07','media-24','media-25']);
  assert.equal(rows.flatMap(mediaLinksFor).length,6);
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
test('same-case court cross-link resolves to the actual October 27 entry',()=>{
  const matched=rows.filter(r=>mediaCourtLink(r,courts));
  assert.deepEqual(matched.map(r=>r.id),['media-14']);
  assert.deepEqual(mediaCourtLink(matched[0],courts).url,'/court-calendar/#alexander-brothers-sentencing');
  assert.equal(mediaCourtLink(matched[0],courts).text,'In court: Oct 27 → Court Calendar');
});
test('rendered route, sitemap, nav and shared style integration',()=>{
  const page=readFileSync('src/pages/true-crime-watch-calendar.astro','utf8');
  assert.match(page,/import CalendarExplainerLink/);
  assert.doesNotMatch(page,/\.calendar-badge\s*\{/);
  assert.match(page,/Not yet confirmed by the network\./);
  assert.match(page,/hidePastMedia\(\)/);
  const nav=readFileSync('src/layouts/Base.astro','utf8');
  assert.equal((nav.match(/label: 'True Crime Watch Calendar'/g)||[]).length,2);
  assert.ok(readFileSync('src/pages/sitemap.xml.ts','utf8').includes("'true-crime-watch-calendar/'"));
  assert.ok(readFileSync('src/pages/llms.txt.ts','utf8').includes('/true-crime-watch-calendar/'));
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
