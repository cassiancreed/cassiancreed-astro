import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {calendarLinksFor,classifyCalendarLink,GUIDE_PREVIEWS,PREVIEW_LINK_TEXT} from '../src/data/calendar-explainer-links.mjs';
import {parseCourtCalendar} from '../src/data/court-calendar-parser.mjs';
const c=parseCourtCalendar(readFileSync('src/data/court-calendar.tsv','utf8'));
const entries=[...c.entries,...c.appeals,...c.unconfirmed,...c.investigations,...c.completed];
const oldKeys=['michelle-parker-'+'case-guide','both-sides-michelle-parker-'+'no-body-guide'];
const productPrefix='https://cassiancreed.beehiiv.com/products/';
const keys=['both-sides-michelle-parker-guide-v3','celeste-rivas-hernandez-d4vd-charges-guide'];
const anchors=(html)=>[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(m=>({attrs:m[1],body:m[2],href:m[1].match(/\bhref="([^"]*)"/)?.[1]?.replace(/&amp;/g,'&')}));
const files=(dir)=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);
test('no retired Parker product destination remains in site sources or built output',()=>{
 for(const root of ['src','public','dist'])for(const file of files(root)){
  if(!/\.(?:astro|mjs|ts|md|mdx|json|txt|tsv|html|xml|js)$/.test(file))continue;
  const content=readFileSync(file,'utf8');
  for(const key of oldKeys)assert.ok(!content.includes(productPrefix+key),file);
 }
});
test('each Parker calendar entry has only the v3 paid offer after free explainers',()=>{
 for(const id of ['parker-smith-first-appearance','parker-smith-bond-hearing']){
  const entry=entries.find(e=>e.id===id);assert.ok(entry);
  const links=calendarLinksFor(entry),paid=links.filter(l=>l.type==='paid');
  assert.equal(paid.length,1);
  assert.equal(new URL(paid[0].url).pathname,'/products/both-sides-michelle-parker-guide-v3');
  assert.equal(paid[0].text,'Both Sides of the Story: Michelle Parker — Can There Be a Murder Case With No Body?');
  assert.equal(paid[0].badge,'$1.99 GUIDE');
  assert.ok(links.slice(0,links.indexOf(paid[0])).every(l=>l.type==='free'));
 }
});
test('a Beehiiv product or book destination cannot be labeled FREE',()=>{
 for(const url of [...keys.map(key=>productPrefix+key),productPrefix+'jury-chess','/books/']){
  assert.notEqual(classifyCalendarLink({url,type:'free'}).badge,'FREE');
 }
});
test('rendered guide offers show prices and each is followed by its FREE page-1 preview',()=>{
 let count=0,previews=0;
 for(const file of files('dist').filter(f=>f.endsWith('.html'))){
  const list=anchors(readFileSync(file,'utf8'));
  list.forEach((a,i)=>{
   if(!keys.some(key=>a.href?.split('?')[0]===productPrefix+key))return;
   assert.match(a.body,/\$1\.99 GUIDE/,file);count++;
   const key=new URL(a.href).pathname.split('/').pop(),next=list[i+1];
   assert.ok(next,'preview after '+key+' in '+file);
   assert.equal(next.href,GUIDE_PREVIEWS[key],'preview after '+key+' in '+file);
   assert.match(next.body,/>FREE</,file);assert.match(next.body,/Read page 1 free (?:→|&rarr;)/,file);
   assert.match(next.attrs,/target="_blank"/,file);assert.match(next.attrs,/rel="noopener"/,file);
   previews++;
  });
 }
 assert.ok(count>=8,'Expected calendar and both free-post offers');
 assert.equal(previews,count);
});
test('every /previews/ link in dist resolves to a real PDF in dist',()=>{
 let seen=0;
 for(const file of files('dist').filter(f=>f.endsWith('.html'))){
  for(const a of anchors(readFileSync(file,'utf8'))){
   if(!a.href?.includes('/previews/'))continue;seen++;
   const path=new URL(a.href,'https://cassiancreed.com').pathname;
   assert.ok(path.startsWith('/previews/')&&path.endsWith('.pdf'),a.href);
   const target=join('dist',decodeURIComponent(path));
   assert.ok(existsSync(target)&&statSync(target).size>1000,'missing '+target+' from '+file);
   assert.equal(readFileSync(target).subarray(0,5).toString(),'%PDF-',target);
  }
 }
 assert.ok(seen>=4,'expected preview links in built pages');
 for(const url of Object.values(GUIDE_PREVIEWS))assert.ok(existsSync(join('dist',url)),url);
});
test('FREE badge never appears on a Beehiiv URL in sources or built output',()=>{
 for(const key of keys){
  const links=calendarLinksFor({id:'x',link:productPrefix+key,linkText:'x'});
  for(const l of links)if(l.badge==='FREE')assert.ok(!/beehiiv\.com/.test(l.url),l.url);
 }
 for(const url of Object.values(GUIDE_PREVIEWS))assert.equal(classifyCalendarLink({url,type:'free'}).badge,'FREE');
 for(const root of ['dist','src/content'])for(const file of files(root).filter(f=>/\.(?:html|md)$/.test(f))){
  for(const a of anchors(readFileSync(file,'utf8'))){
   const free=/data-link-type="free"/.test(a.attrs)||/calendar-badge[^>]*>FREE</.test(a.body);
   if(free)assert.ok(!/beehiiv\.com/i.test(a.href||''),'FREE on Beehiiv '+a.href+' in '+file);
  }
 }
});
test('D4vd keeps its paid section before Sources and posts reuse shared badge CSS',()=>{
 const s=readFileSync('src/content/posts/what-happens-at-d4vds-monday-hearing.md','utf8');
 assert.ok(s.indexOf('## What to watch for next')<s.indexOf('## Want the full case in one place?'));
 assert.ok(s.indexOf('## Want the full case in one place?')<s.indexOf('## Sources'));
 assert.ok(s.includes(productPrefix+keys[1]));
 assert.ok(s.indexOf(productPrefix+keys[1])<s.indexOf(GUIDE_PREVIEWS[keys[1]]));
 assert.match(readFileSync('src/pages/post/[slug].astro','utf8'),/calendar-explainer-links\.css/);
 assert.match(readFileSync('src/components/CalendarExplainerLink.astro','utf8'),/calendar-explainer-links\.css/);
 assert.equal(PREVIEW_LINK_TEXT,'Read page 1 free');
});
test('no old Parker product slugs remain anywhere in sources or built output',()=>{
 for(const root of ['src','public','dist','scripts'])for(const file of files(root)){
  if(!/\.(?:astro|mjs|ts|md|mdx|json|txt|tsv|html|xml|js|css)$/.test(file))continue;
  const content=readFileSync(file,'utf8');
  for(const key of oldKeys)assert.ok(!content.includes(key),key+' in '+file);
 }
});
