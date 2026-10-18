import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {calendarLinksFor,classifyCalendarLink} from '../src/data/calendar-explainer-links.mjs';
import {GUIDE_PREVIEWS,linksWithGuidePreviews} from '../src/data/guide-previews.mjs';
import {parseCourtCalendar} from '../src/data/court-calendar-parser.mjs';
const c=parseCourtCalendar(readFileSync('src/data/court-calendar.tsv','utf8'));
const entries=[...c.entries,...c.appeals,...c.unconfirmed,...c.investigations,...c.completed];
const oldKeys=['michelle-parker-'+'case-guide','both-sides-michelle-parker-'+'no-body-guide'];
const productPrefix='https://cassiancreed.beehiiv.com/products/';
const files=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);
test('no retired Parker product destination remains in site sources or built output',()=>{
 for(const root of ['src','public','dist'])for(const file of files(root)){
  if(!/\.(?:astro|mjs|ts|md|mdx|json|txt|tsv|html|xml|js)$/.test(file))continue;
  const content=readFileSync(file,'utf8');
  for(const key of oldKeys)assert.ok(!content.includes(productPrefix+key),file);
 }
});
test('each Parker calendar entry has one v3 offer followed by its free preview',()=>{
 for(const id of ['parker-smith-first-appearance','parker-smith-bond-hearing']){
  const entry=entries.find(e=>e.id===id);assert.ok(entry);
  const links=calendarLinksFor(entry),paid=links.filter(l=>l.type==='paid');
  assert.equal(paid.length,1);
  assert.equal(new URL(paid[0].url).pathname,'/products/both-sides-michelle-parker-guide-v3');
  assert.equal(paid[0].text,'Both Sides of the Story: Michelle Parker — Can There Be a Murder Case With No Body?');
  assert.equal(paid[0].badge,'$1.99 GUIDE');
  const displayed=linksWithGuidePreviews(links),i=displayed.findIndex(l=>l===paid[0]);
  assert.ok(displayed.slice(0,i).every(l=>l.type==='free'));
  assert.equal(displayed[i+1].url,GUIDE_PREVIEWS['both-sides-michelle-parker-guide-v3']);
  assert.equal(displayed[i+1].badge,'FREE');assert.equal(displayed[i+1].newTab,true);
 }
});
test('D4vd samples follow only their matching paid guide',()=>{
 const links=calendarLinksFor(entries.find(e=>e.id==='burke-prelim'));
 const displayed=linksWithGuidePreviews(links),i=displayed.findIndex(l=>l.bookKey==='celeste-rivas-hernandez-d4vd-charges-guide');
 assert.ok(i>0);assert.equal(displayed[i+1].url,GUIDE_PREVIEWS['celeste-rivas-hernandez-d4vd-charges-guide']);
 assert.equal(displayed[i+1].previewFor,displayed[i].bookKey);
 assert.equal(classifyCalendarLink({url:'/books/'}).preview,undefined);
});
test('a Beehiiv product or book destination cannot be labeled FREE',()=>{
 for(const url of [...Object.keys(GUIDE_PREVIEWS).map(key=>productPrefix+key),productPrefix+'jury-chess','/books/']){
  assert.notEqual(classifyCalendarLink({url,type:'free'}).badge,'FREE');
 }
});
test('every preview is an unchanged PDF in the source and built public directory',()=>{
 for(const url of Object.values(GUIDE_PREVIEWS)){
  assert.ok(existsSync('public'+url),'Missing source preview '+url);
  assert.ok(existsSync('dist'+url),'Missing built preview '+url);
  const source=readFileSync('public'+url),built=readFileSync('dist'+url);
  assert.equal(source.subarray(0,5).toString(),'%PDF-');
  assert.deepEqual(built,source,url);
 }
});
const anchors=(html)=>[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(m=>({attrs:m[1],body:m[2],href:m[1].match(/\bhref="([^"]*)"/)?.[1]}));
test('all matching rendered offers have an adjacent FREE sample opening in a new tab',()=>{
 let count=0;
 for(const file of files('dist').filter(f=>f.endsWith('.html'))){
  const links=anchors(readFileSync(file,'utf8'));
  for(let i=0;i<links.length;i++){
   const a=links[i],key=Object.keys(GUIDE_PREVIEWS).find(k=>a.href?.split('?')[0]===productPrefix+k);
   if(a.attrs.includes('data-link-type="free"'))assert.ok(!a.href?.startsWith(productPrefix),'FREE product '+file);
   if(!key)continue;
   assert.match(a.body,/\$1\.99 GUIDE/,file);
   const preview=links[i+1];assert.ok(preview,file);
   assert.equal(preview.href,GUIDE_PREVIEWS[key],file);
   assert.match(preview.body,/>FREE</);assert.match(preview.body,/Read page 1 free/);
   assert.match(preview.attrs,/target="_blank"/);assert.match(preview.attrs,/rel="noopener noreferrer"/);count++;
  }
 }
 assert.ok(count>=8,'Expected calendar and both free-post offers');
});
test('D4vd offer stays between watch-next and Sources; posts share calendar badge CSS',()=>{
 const s=readFileSync('src/content/posts/what-happens-at-d4vds-monday-hearing.md','utf8');
 assert.ok(s.indexOf('## What to watch for next')<s.indexOf('## Want the full case in one place?'));
 assert.ok(s.indexOf('## Want the full case in one place?')<s.indexOf('## Sources'));
 assert.match(readFileSync('src/pages/post/[slug].astro','utf8'),/calendar-explainer-links\.css/);
 assert.match(readFileSync('src/components/CalendarExplainerLink.astro','utf8'),/calendar-explainer-links\.css/);
});
