import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyCalendarLink } from '../src/data/calendar-explainer-links.mjs';
import { JURY_CHESS_PRICE, JURY_CHESS_PRICE_TEXT } from '../src/data/book-prices.mjs';
const pages=['court-calendar','true-crime-watch-calendar'].map(route=>({route,html:readFileSync('dist/'+route+'/index.html','utf8').replace(/<script\b[\s\S]*?<\/script>/g,'')}));
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const anchors=html=>[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(m=>({attrs:m[1],body:m[2],href:m[1].match(/\bhref="([^"]*)"/)?.[1]?.replace(/&amp;/g,'&')}));
const badges=a=>[...a.body.matchAll(/<span\b[^>]*class="calendar-badge"[^>]*>([\s\S]*?)<\/span>/g)].map(m=>clean(m[1]));
test('FREE is limited to explainer resources and free signup; paid badges have prices',()=>{
  for(const p of pages) for(const a of anchors(p.html)) {
    const words=badges(a);
    if(words.includes('FREE')) {
      assert.doesNotMatch(a.href,/\.beehiiv\.com\/products\/|\/books(?:\/|$)/);
      assert.ok(a.attrs.includes('calendar-resource') || /court-updates|subscribe-forms\.beehiiv\.com/.test(a.href),p.route+' '+a.href);
    }
    if(a.attrs.includes('calendar-resource') || a.attrs.includes('id="jury-chess-court-calendar"')) {
      const expected=classifyCalendarLink({url:a.href});
      assert.deepEqual(words,[expected.badge],a.href);
      if(expected.type==='paid') assert.match(words[0],/^\$\d+\.\d{2} GUIDE$/);
      if(expected.type==='book') assert.equal(words[0],'BOOK '+JURY_CHESS_PRICE_TEXT);
    }
  }
});
test('plain nav, footer, Calendar details, sources and calendar cross-links have no badge',()=>{
  for(const p of pages) {
    const scopes=[p.html.match(/<header\b[\s\S]*?<\/header>/)?.[0],p.html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0],p.html.match(/<nav\b[^>]*class="wrap cal-quick-links"[^>]*>[\s\S]*?<\/nav>/)?.[0]].filter(Boolean);
    for(const scope of scopes) for(const a of anchors(scope)) {
      if(a.attrs.includes('calendar-resource'))continue;
      assert.deepEqual(badges(a),[],a.href);
    }
    for(const a of anchors(p.html)) {
      const label=clean(a.body);
      if(/Calendar details|What to watch:|Real cases in court:|In court: .*Court Calendar|In court now|Detailed entries|Closed cases|Report a correction/.test(label)) assert.deepEqual(badges(a),[],label);
    }
    if(p.route==='court-calendar') {
      const panel=p.html.match(/<aside\b[^>]*class="home-calendar__agenda"[^>]*>[\s\S]*?<\/aside>/)?.[0];assert.ok(panel);
      const signup=anchors(panel).filter(a=>a.href==='#court-updates');assert.ok(signup.length);
      for(const a of signup)assert.deepEqual(badges(a),['FREE']);
    }
  }
});
test('both legends retain dots and exact owner wording',()=>{
  for(const p of pages) {
    const legend=p.html.match(/<p\b[^>]*class="calendar-legend"[^>]*>[\s\S]*?<\/p>/)?.[0];assert.ok(legend);
    assert.equal(clean(legend),'FREE explainer · $1.99 guide · BOOK');
    assert.equal((legend.match(/class="calendar-dot"/g)||[]).length,3);
  }
});
test('book landing pages and calendar badges use the same existing direct price field',()=>{
  for(const page of ['books','books/jury-chess']) {
    const html=readFileSync('dist/'+page+'/index.html','utf8');
    assert.ok(html.includes(JURY_CHESS_PRICE_TEXT),page);
    const ld=[...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1])).flatMap(item=>item['@graph']??[item]);
    const book=ld.find(item=>item.name==='Jury Chess: How Criminal Jury Trials Actually Work');
    assert.ok(book,page);assert.equal(book.offers[0].price,JURY_CHESS_PRICE);
  }
});
