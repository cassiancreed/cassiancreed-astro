import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {calendarLinksFor,classifyCalendarLink} from '../src/data/calendar-explainer-links.mjs';
import {parseCourtCalendar} from '../src/data/court-calendar-parser.mjs';
const c=parseCourtCalendar(readFileSync('src/data/court-calendar.tsv','utf8'));
const entries=[...c.entries,...c.appeals,...c.unconfirmed,...c.investigations,...c.completed];
const oldKeys=['michelle-parker-'+'case-guide','both-sides-michelle-parker-'+'no-body-guide'];
const productPrefix='https://cassiancreed.beehiiv.com/products/';
const keys=['both-sides-michelle-parker-guide-v3','celeste-rivas-hernandez-d4vd-charges-guide'];
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
test('rendered guide offers show prices and no preview links are published',()=>{
 let count=0;
 for(const file of files('dist').filter(f=>f.endsWith('.html'))){
  const html=readFileSync(file,'utf8');
  assert.ok(!html.includes('Read page 1 free'),file);
  assert.ok(!html.includes('/previews/'),file);
  for(const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)){
   const href=match[1].match(/\bhref="([^"]*)"/)?.[1];
   if(match[1].includes('data-link-type="free"'))assert.ok(!href?.startsWith(productPrefix),'FREE product '+file);
   if(!keys.some(key=>href?.split('?')[0]===productPrefix+key))continue;
   assert.match(match[2],/\$1\.99 GUIDE/,file);count++;
  }
 }
 assert.ok(count>=8,'Expected calendar and both free-post offers');
});
test('D4vd keeps its paid section before Sources and posts reuse shared badge CSS',()=>{
 const s=readFileSync('src/content/posts/what-happens-at-d4vds-monday-hearing.md','utf8');
 assert.ok(s.indexOf('## What to watch for next')<s.indexOf('## Want the full case in one place?'));
 assert.ok(s.indexOf('## Want the full case in one place?')<s.indexOf('## Sources'));
 assert.ok(s.includes(productPrefix+keys[1]));
 assert.match(readFileSync('src/pages/post/[slug].astro','utf8'),/calendar-explainer-links\.css/);
 assert.match(readFileSync('src/components/CalendarExplainerLink.astro','utf8'),/calendar-explainer-links\.css/);
 for(const file of files('src')){
  if(!/\.(?:astro|mjs|md|mdx|ts|css)$/.test(file))continue;
  const content=readFileSync(file,'utf8');
  assert.ok(!content.includes('Read page 1 free'),file);assert.ok(!content.includes('/previews/'),file);
 }
});
