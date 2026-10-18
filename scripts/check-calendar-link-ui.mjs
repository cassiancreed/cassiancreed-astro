import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { calendarLinksFor, calendarLinkTypesFor, JURY_CHESS_EXCLUDED_IDS } from '../src/data/calendar-explainer-links.mjs';
import { parseCourtCalendar } from '../src/data/court-calendar-parser.mjs';
const base = 'c7b88e81cf803f05e5f45b5bc48e6f3456f7544b';
for (const path of ['src/data/court-calendar.tsv','src/data/court-calendar-archive.tsv','src/data/international-watch.tsv']) {
  assert.equal(readFileSync(path,'utf8'),execFileSync('git',['show',base+':'+path],{encoding:'utf8'}),path);
}
const c = parseCourtCalendar(readFileSync('src/data/court-calendar.tsv','utf8'));
const all = [...c.entries,...c.appeals,...c.unconfirmed,...c.investigations,...c.completed];
const bookEntries = all.filter(e=>calendarLinksFor(e).some(l=>l.type==='book')).map(e=>({id:e.id,case:e.case,event:e.proceeding}));
mkdirSync('cal05-receipts',{recursive:true});
const browser = await chromium.launch();
const summaries=[];
const builtPageBadges = {};
const lum = hex => {
  const c=hex.match(/\w\w/g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return c[0]*.2126+c[1]*.7152+c[2]*.0722;
};
const contrast=(a,b)=>(Math.max(lum(a),lum(b))+.05)/(Math.min(lum(a),lum(b))+.05);
const colors={free:'86efac',paid:'f6c76b',book:'d8b4fe'};
const ratios=Object.fromEntries(Object.entries(colors).map(([k,v])=>[k,contrast(v,'14110f')]));
for(const r of Object.values(ratios)) assert.ok(r>=4.5);
for (const width of [1280,390]) {
  const context = await browser.newContext({viewport:{width,height:1000}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const route of ['/court-calendar/','/']) {
    await page.goto('http://127.0.0.1:4321'+route,{waitUntil:'networkidle'});
    await page.waitForSelector('[data-calendar-days] button');
    assert.equal((await page.locator('.calendar-legend').innerText()).replace(/\s+/g,' ').trim(),'FREE explainer · $ guide · BOOK');
    assert.equal(await page.locator('.calendar-book-card').count(),1);
    assert.equal(await page.locator('.calendar-book-card').isVisible(),(await page.locator('[data-calendar-agenda] .calendar-resource[data-link-type="book"]').count()) > 0);
    assert.equal(await page.locator('.home-calendar__agenda-disclaimer').evaluate(n=>n.nextElementSibling?.classList.contains('calendar-book-card')),true);
    assert.equal(await page.locator('.calendar-book-card a').getAttribute('href'),'https://cassiancreed.com/books/');
    const raw=JSON.parse(await page.locator('[data-calendar-json]').textContent());
    const buildDate=await page.locator('[data-home-calendar]').getAttribute('data-build-date');
    const checkLinks=async (scope,expected,label)=>{
      const actual=await scope.locator('a.calendar-resource').evaluateAll(ns=>ns.map(n=>[n.getAttribute('href'),n.dataset.linkType,n.querySelector('.calendar-badge')?.textContent,n.querySelector('span:last-child')?.textContent.trim()]));
      assert.deepEqual(actual,expected.map(l=>[l.url,l.type,l.badge,l.text+' →']),label);
      assert.deepEqual(await scope.locator('.calendar-resource').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>n.textContent)),[],label+' clipping');
    };
    let detailCount=0,listCount=0,selectedCount=0,dotCount=0;
    if(route==='/court-calendar/') {
      for(const e of all) {
        const detail=page.locator('[id="'+e.id+'"]');
        if(!await detail.count()) continue;
        const scope=detail.locator('.row__links,.card__links').first();
        if(await scope.count()){
          const expected = calendarLinksFor(e);
          await checkLinks(scope,expected,'detail '+e.id);
          if(e.id !== 'mary-collins-trial') assert.equal(await scope.locator('.card__soon').count(),expected.every(link=>link.type==='book') ? 1 : 0,'case-file fallback '+e.id);
          detailCount++;
        }
        const index=page.locator('[data-calendar-list-entry="'+e.id+'"]');
        if(await index.count()){await checkLinks(index,calendarLinksFor(e),'list '+e.id);listCount++;}
      }
    }
    const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:1000}});
    const server=await nojs.newPage();
    await server.goto('http://127.0.0.1:4321'+route);
    if(width === 1280) {
      builtPageBadges[route] = {};
      for(const type of ['free','paid','book']) {
        const badges = server.locator('.calendar-badge[data-link-type="'+type+'"]');
        builtPageBadges[route][type] = {total:await badges.count(), visible:await badges.evaluateAll(ns=>ns.filter(n=>n.getClientRects().length>0).length)};
      }
    }
    for(const e of raw) {
      const item=server.locator('[data-calendar-agenda] [data-calendar-entry="'+e.id+'"]');
      if(await item.count()) await checkLinks(item,e.explainerLinks,'SSR '+e.id);
    }
    const dates=[...new Set(raw.filter(e=>e.dateISO>=buildDate).map(e=>e.dateISO))].sort();
    for(const date of dates){
      let attempts=0;
      while(!await page.locator('[data-calendar-date="'+date+'"]').count() && attempts++<24) await page.locator('[data-calendar-next]').click();
      const day=page.locator('[data-calendar-date="'+date+'"]');
      assert.equal(await day.count(),1,date);
      const dayEntries=raw.filter(e=>e.dateISO===date);
      const expectedTypes=calendarLinkTypesFor(dayEntries);
      assert.deepEqual(await day.locator('.calendar-dot').evaluateAll(ns=>ns.map(n=>n.dataset.linkType)),expectedTypes,'dots '+date);
      assert.deepEqual(await day.locator('.calendar-dot').evaluateAll(ns=>ns.filter(n=>{const r=n.getBoundingClientRect();return r.width<5||r.height<5}).map(n=>n.dataset.linkType)),[],'visible dots');
      const aria=await day.getAttribute('aria-label');
      for(const type of expectedTypes) assert.ok(aria.includes({free:'FREE explainer',paid:'paid guide',book:'BOOK'}[type]),'accessible dot '+date);
      dotCount++;
      await day.click();
      assert.equal(await page.locator('.calendar-book-card').isVisible(),dayEntries.some(entry=>entry.explainerLinks.some(link=>link.type==='book')));
      for(const e of dayEntries) {
        const item=page.locator('[data-calendar-agenda] [data-calendar-entry="'+e.id+'"]');
        assert.equal(await item.count(),1,e.id);
        await checkLinks(item,e.explainerLinks,'selected '+e.id);
        selectedCount++;
      }
    }
    // Select a real empty day, then return to today. BOOK card must hide on empty dates.
    await page.locator('[data-calendar-today]').click();
    const emptyDay = page.locator('[data-calendar-date]:not(.has-events)').first();
    assert.ok(await emptyDay.count());
    await emptyDay.click();
    assert.equal(await page.locator('.calendar-book-card').isVisible(),false);
    await page.locator('[data-calendar-today]').click();
    assert.equal(await page.locator('.calendar-book-card').count(),1);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'page width '+width+' '+route);
    const badgeColors=await page.locator('.calendar-badge').evaluateAll(ns=>ns.map(n=>({type:n.dataset.linkType,color:getComputedStyle(n).color,bg:getComputedStyle(n).backgroundColor,fontSize:getComputedStyle(n).fontSize})));
    for(const b of badgeColors){
      assert.equal(b.fontSize,'11px');
      assert.equal(b.color,'rgb(20, 17, 15)');
      assert.equal(b.bg,{free:'rgb(134, 239, 172)',paid:'rgb(246, 199, 107)',book:'rgb(216, 180, 254)'}[b.type]);
    }
    await page.screenshot({path:'cal05-receipts/'+(route==='/'?'home':'calendar')+'-'+width+'.png',fullPage:route==='/'});
    summaries.push({width,route,detailCount,listCount,selectedCount,dotCount,serverRendering:'passed',colors:'passed',overflow:'none'});
    await nojs.close();
  }
  assert.deepEqual(errors,[]);
  await context.close();
}
await browser.close();
const receipt={base,commit:process.env.GITHUB_SHA,checkedAt:new Date().toISOString(),unchangedTsvs:true,legend:'FREE explainer · $ guide · BOOK',badgeText:'#14110f',colors,contrastRatios:ratios,bookEntryCount:bookEntries.length,newBookEntryCount:bookEntries.length-1,excludedBookIds:[...JURY_CHESS_EXCLUDED_IDS],bookEntries,builtPageBadges,summaries};
writeFileSync('cal05-receipts/audit.json',JSON.stringify(receipt,null,2));
console.log('CAL05_AUDIT '+JSON.stringify(receipt));
