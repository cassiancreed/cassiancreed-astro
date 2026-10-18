import assert from 'node:assert/strict';
import { readFileSync,mkdirSync,writeFileSync,readdirSync } from 'node:fs';
import { chromium } from 'playwright';
import { parseMediaCalendar,mediaDates,visibleMediaRows } from '../src/data/media-calendar-parser.mjs';
import { mediaLinksFor,mediaCourtLink } from '../src/data/media-explainer-links.mjs';
import { parseCourtCalendar } from '../src/data/court-calendar-parser.mjs';
const {rows}=parseMediaCalendar(readFileSync('src/data/media-calendar.tsv','utf8'));
const court=parseCourtCalendar(readFileSync('src/data/court-calendar.tsv','utf8'));
const courts=[...court.entries,...court.appeals,...court.unconfirmed,...court.investigations,...court.completed];
const origin='http://127.0.0.1:4321';
mkdirSync('media01-receipts',{recursive:true});
const browser=await chromium.launch();
const summaries=[];
for(const width of [1280,1024,390]) {
  const context=await browser.newContext({viewport:{width,height:1000}});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install({time:new Date('2026-10-18T19:00:00Z')});
  const response=await page.goto(origin+'/true-crime-watch-calendar/',{waitUntil:'networkidle'});
  assert.equal(response.status(),200);
  assert.equal(await page.locator('h1').innerText(),'True Crime Watch Calendar');
  assert.equal((await page.locator('.calendar-legend').innerText()).replace(/\s+/g,' ').trim(),'FREE explainer · $ guide · BOOK');
  assert.equal(await page.locator('.watch-row:visible').count(),28);
  assert.equal(await page.locator('.calendar-badge[data-link-type="book"]').count(),0);
  assert.equal(await page.locator('.calendar-badge[data-link-type="paid"]').count(),0);
  assert.equal(await page.locator('.calendar-badge[data-link-type="free"]').count(),6);
  assert.ok((await page.locator('#media-25 .watch-status').innerText()).startsWith('Not yet confirmed by the network.'));
  for(const row of rows) {
    const scope=page.locator('#'+row.id);
    assert.equal(await scope.locator('h3').innerText(),row.title);
    assert.equal(await scope.locator('.watch-date').innerText(),row.date_text+' · '+row.time_text);
    assert.equal(await scope.locator('.watch-description').innerText(),row.description);
    assert.deepEqual(await scope.locator('.calendar-resource').evaluateAll(ns=>ns.map(n=>[n.getAttribute('href'),n.dataset.linkType])),mediaLinksFor(row).map(l=>[l.url,l.type]));
    const cross=mediaCourtLink(row,courts);
    if(cross) {
      assert.equal(await scope.locator('.watch-cross-link').getAttribute('href'),cross.url);
      assert.equal(await scope.locator('.watch-cross-link').innerText(),cross.text);
    }
  }
  const styles=await page.locator('.calendar-badge').evaluateAll(ns=>ns.map(n=>({bg:getComputedStyle(n).backgroundColor,ink:getComputedStyle(n).color,size:getComputedStyle(n).fontSize})));
  for(const s of styles)assert.deepEqual(s,{bg:'rgb(134, 239, 172)',ink:'rgb(20, 17, 15)',size:'11px'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'page overflow '+width);
  assert.deepEqual(await page.locator('.calendar-resource,.watch-row').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>n.id||n.textContent)),[],'clipping '+width);
  if(width===390) {
    await page.locator('.nav-menu>summary').click();
    assert.equal(await page.locator('.nav-menu a[href="/true-crime-watch-calendar/"]').isVisible(),true);
    await page.locator('.nav-menu>summary').click();
  } else {
    const links=page.locator('.nav--desktop a[href="/true-crime-watch-calendar/"]');
    if(await links.isVisible()) {
      assert.equal(await links.evaluate(n=>n.previousElementSibling?.getAttribute('href')),'/court-calendar/');
    }
  }
  await page.screenshot({path:'media01-receipts/watch-'+width+'.png',fullPage:true});
  await page.clock.setSystemTime(new Date('2026-10-19T07:00:00Z'));
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  assert.equal(await page.locator('.watch-row:visible').count(),23);
  await page.clock.setSystemTime(new Date('2026-11-18T08:01:00Z'));
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  assert.equal(await page.locator('.watch-row:visible').count(),0);
  assert.equal(await page.locator('.watch-empty:visible').count(),2);
  assert.deepEqual(errors,[]);
  summaries.push({width,renderedRows:28,freeBadges:6,paidBadges:0,bookBadges:0,overflow:false,pacificMidnightHiding:'passed',finiteStandingHiding:'passed',consoleErrors:errors});
  await context.close();
}
const context=await browser.newContext();
const page=await context.newPage();
await page.goto(origin+'/court-calendar/#alexander-brothers-sentencing');
assert.equal(await page.locator('#alexander-brothers-sentencing').count(),1);
assert.equal(await page.locator('a[href="/true-crime-watch-calendar/"]').filter({hasText:'What to watch:'}).count(),1);
const sitemap=await (await context.request.get(origin+'/sitemap.xml')).text();assert.ok(sitemap.includes(origin.replace('http://127.0.0.1:4321','https://cassiancreed.com')+'/true-crime-watch-calendar/'));
assert.ok((await (await context.request.get(origin+'/llms.txt')).text()).includes('https://cassiancreed.com/true-crime-watch-calendar/'));
await browser.close();
// Search the complete published-post corpus for same-case candidates, including body mentions.
const needles=['Dorothy Lou Thompson','Sydney Loofe','Bagnato','Stephanie Pavlons','Alexander brothers','Alon Alexander','Oren Alexander','Tal Alexander','Tausha Haight','Zambada','Calva Zepeda','Isabel Fuentes','Kara Robinson','Richard Evonitz'];
const candidates=[];
for(const name of readdirSync('src/content/posts')) {
 if(!/\.mdx?$/.test(name))continue;
 const raw=readFileSync('src/content/posts/'+name,'utf8');
 if(/^(archived|draft):\s*true/m.test(raw.split('---')[1]||''))continue;
 const hits=needles.filter(n=>raw.toLowerCase().includes(n.toLowerCase()));
 if(hits.length)candidates.push({file:name,title:raw.match(/^title:\s*(.+)$/m)?.[1],hits,lines:raw.split('\n').filter(l=>hits.some(h=>l.toLowerCase().includes(h.toLowerCase())))});
}
const result={commit:process.env.GITHUB_SHA,checkedAt:new Date().toISOString(),summaries,sameCaseCandidates:candidates};
writeFileSync('media01-receipts/audit.json',JSON.stringify(result,null,2));
console.log('MEDIA_UI '+JSON.stringify(result));
