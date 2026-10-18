import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyCalendarLink } from '../src/data/calendar-explainer-links.mjs';
const routes=['court-calendar','true-crime-watch-calendar'];
const pages=routes.map(route=>({route,html:readFileSync('dist/'+route+'/index.html','utf8').replace(/<script\b[\s\S]*?<\/script>/g,'')}));
const clean=s=>s.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const anchors=html=>[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(m=>({attrs:m[1],body:m[2],href:m[1].match(/\bhref="([^"]*)"/)?.[1]?.replace(/&amp;/g,'&')}));
function checkAnchors(html,label) {
  const all=anchors(html);assert.ok(all.length,label);
  for(const a of all) {
    assert.ok(a.href,label+' href');
    const badges=[...a.body.matchAll(/<span\b[^>]*class="calendar-badge"[^>]*>([\s\S]*?)<\/span>/g)];
    assert.equal(badges.length,1,label+' '+a.href);
    const expected=classifyCalendarLink({url:a.href});
    assert.equal(clean(badges[0][1]),expected.badge,label+' '+a.href);
    if(expected.type!=='free') assert.notEqual(clean(badges[0][1]),'FREE',a.href);
  }
}
test('all free links on both calendar pages have cost badges in initial HTML',()=>{
  for(const p of pages)checkAnchors(p.html,p.route);
});
test('Selected Date and footer navigation links all carry cost badges without JavaScript',()=>{
  for(const p of pages) {
    const footer=p.html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];assert.ok(footer);checkAnchors(footer,p.route+' footer');
    if(p.route==='court-calendar') {
      const panel=p.html.match(/<aside\b[^>]*class="home-calendar__agenda"[^>]*>[\s\S]*?<\/aside>/)?.[0];
      assert.ok(panel);checkAnchors(panel,'Selected Date');
      const nav=p.html.match(/<nav\b[^>]*class="wrap cal-quick-links"[^>]*>[\s\S]*?<\/nav>/)?.[0];
      assert.ok(nav);checkAnchors(nav,'calendar footer nav');
    }
  }
});
test('both legends retain dots and exact no-cost wording',()=>{
  for(const p of pages) {
    const legend=p.html.match(/<p\b[^>]*class="calendar-legend"[^>]*>[\s\S]*?<\/p>/)?.[0];
    assert.ok(legend,p.route);
    assert.equal(clean(legend),'FREE = no cost · $ guide = $1.99 · BOOK');
    assert.equal((legend.match(/class="calendar-dot"/g)||[]).length,3);
  }
});
