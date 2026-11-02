import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
// No-child-names rule: NEP never names a child victim. Runs after Astro builds,
// so missing output is a failure, never a silent skip.
// The children's first names in this case are stored only as SHA-256 hashes
// of the lowercase word, so this public test file never spells them out.
const CHILD_NAME_HASHES=new Set([
  'b8d8a9b672985b1df0c1c580e2981200646f9120945b31f5407722bda0e1e62a',
  '9691cf90923cba9d50a547cd5af5c04ebc0f40055a10f2f38a8b020a02e83c9d',
  'da300511638e3ff16685f1e37560546114df666ee1b507c1679125345aaf9483',
]);
const hash=word=>createHash('sha256').update(word.toLowerCase()).digest('hex');
// Pages built from a Clancy post: any hit fails. Other built files that mention
// the case: a hit fails when it sits within this many characters of "Clancy".
const CONTEXT=400;
function files(dir) {
  return readdirSync(dir).flatMap(name=>{
    const path=join(dir,name);
    if(statSync(path).isDirectory()) return name==='_astro'?[]:files(path);
    return /\.(html|xml|txt|json)$/.test(name)?[path]:[];
  });
}
function hits(text) {
  return [...text.matchAll(/[A-Za-z]+/g)].filter(m=>CHILD_NAME_HASHES.has(hash(m[0]))).map(m=>m.index);
}
const built=files('dist').map(path=>({path,text:readFileSync(path,'utf8')})).filter(f=>f.text.includes('Clancy'));
test('built Clancy post pages exist',()=>{
  const posts=built.filter(f=>/^dist\/post\/[^/]*clancy[^/]*\/index\.html$/.test(f.path));
  assert.ok(posts.length>=4,'Expected at least 4 built Clancy post pages, found '+posts.length);
});
test('built Clancy post pages never name the child victims',()=>{
  for(const f of built.filter(f=>/^dist\/post\/[^/]*clancy/.test(f.path))) {
    assert.equal(hits(f.text).length,0,f.path+' names a Clancy child victim');
  }
});
test('no other built page names a Clancy child victim near the case name',()=>{
  for(const f of built.filter(f=>!/^dist\/post\/[^/]*clancy/.test(f.path))) {
    const near=hits(f.text).filter(i=>f.text.slice(Math.max(0,i-CONTEXT),i+CONTEXT).includes('Clancy'));
    assert.equal(near.length,0,f.path+' names a Clancy child victim');
  }
});

// Minor Shield (Doctrine v2.7): on the calendar pages, no child victim's name may
// reach structured data (JSON-LD), the page title, meta tags or alt text. Those
// are what search engines, social cards and screen readers pick up. The list is
// CHILD_NAME_HASHES above, the Minor Shield list in viral-watch.json, and the
// calendar names below. Single words are used only for distinctive names; a
// first name that is also a common word or place is checked as "first last".
const viralWatch=JSON.parse(readFileSync('src/data/viral-watch.json','utf8'));
const CALENDAR_WORD_HASHES=new Set([
  ...CHILD_NAME_HASHES,
  ...viralWatch.safety.minor_name_hashes,
  '5b0e1ceb3173b8ff0de2a262df2abaa0d403bfaea700f399f82a4c9f7226398b', // Los Angeles murder case rows: victim (14), first name
  '890dbc9bccdbc3cb8cb4684578d283b4506c41f9934c1e5b0132b77cdafd1b41', // Mukdahan (Thailand) case victim, nickname
  'b42878b772050402f45fbf662c6660df8f97c23677ebbf9dcdc8e54b3ca6d007', // Mukdahan (Thailand) case victim, first name
  'e804ad19613d5deee5335d15fbcd9eba69d41c829f48575966217213c86ebe85', // Mukdahan (Thailand) case victim, family name
  'b1f57dc257db82155f8378e9a2099e434ed4b59c42e9e3453b9d04075f2f9d81', // Apalachee shooting student victim, family name
  'cfcd47a89a49b999d075caba75f776190b0e35805340ae2a5bef2ceb0f89e6a0', // East Baton Rouge Parish investigation victim (15), family name
]);
// A juvenile charged with a crime under age 16 is never named anywhere on the
// site: not in a title, heading, address, ID or in the article text.
const JUVENILE_UNDER_16_PAIR_HASHES=new Set([
  '4b3df2a38155760d64f874d4f5fc79146b3b2518ccab8db875d274518a904585', // Apalachee High School shooting: defendant charged at 14, first and family name
  '51c2557a6c8f30a6f5bc1303488423bfe4413fbd4a593d1faf2118a23736cdca', // Chippewa County homicide case: defendant charged at 14, first name and first family name
  'd25eea619d295c8844a9481be56491c0947eaee43aa358fa700338ddae2e60f3', // Chippewa County homicide case: defendant charged at 14, the two family names
]);
const CALENDAR_PAIR_HASHES=new Set([
  ...JUVENILE_UNDER_16_PAIR_HASHES,
  '0aa09f4887d655ee0425c0371adfad190d3128d07585952ff87b2f0f8d21496f', // Los Angeles murder case rows: victim (14), family names
  '1a1c6e7377be6efed9aceac1e24a4eb92d244d58df264c5d28b9141664d1dc13', // Chippewa County case victim
  '36376b8d6cbf6d302ac5cce63811ec62d93efe66e28c08c8462a7f9a6650f103', // Saratoga Springs case child victim
  'be3aae4585ddd63c50de1fd9fde6d2cdba5ae082b5f7618c2602773c5e5c4793', // Round Lake Beach (Illinois) newborn case: the name the infant was known by
  '868c3396c2ea352fdd7917327c7a186a65922c089081b2026af0193fcedcad5c', // Frisco (Texas) track-meet case: victim (17)
  'ac4e8d3be7aff3adb9f7b9ca340468b46bcb17d25860b1f56942b9e3a413188d', // Brantham (Suffolk) coronial case child
  '1b1e3f1122c3188fc7068cfc0eabac30ac70e73c3df36c786f88a5f0bfa02371', // Apalachee shooting student victim
  'bb70416bf82131c672b41b711d674e9ec94e931934981b5306cd1562dafc2cc6', // Anoka County trial-watch row: teen victim
]);
const CALENDAR_PAGES=[
  'dist/court-calendar/index.html',
  'dist/court-calendar/archive/index.html',
  'dist/international-court-watch/index.html',
  'dist/today/index.html',
  'dist/index.html',
];
function schemaAndMeta(text) {
  return [
    ...[...text.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]),
    ...[...text.matchAll(/<title>([\s\S]*?)<\/title>/g)].map(m=>m[1]),
    ...[...text.matchAll(/<meta\b[^>]*\bcontent="([^"]*)"/g)].map(m=>m[1]),
    ...[...text.matchAll(/\balt="([^"]*)"/g)].map(m=>m[1]),
  ].join('\n');
}
function calendarNameHits(text) {
  const words=[...text.matchAll(/[A-Za-z]+/g)].map(m=>m[0].toLowerCase());
  return words.filter((word,i)=>CALENDAR_WORD_HASHES.has(hash(word))
    ||(i+1<words.length&&CALENDAR_PAIR_HASHES.has(hash(word+' '+words[i+1])))).length;
}
test('calendar pages keep child victims out of structured data, meta tags and alt text',()=>{
  for(const path of CALENDAR_PAGES) {
    const text=readFileSync(path,'utf8');
    assert.ok(schemaAndMeta(text).length>0,path+' has no structured data or meta tags to check');
    assert.equal(calendarNameHits(schemaAndMeta(text)),0,path+' puts a child victim’s name in structured data, meta tags or alt text');
  }
});

// ---------------------------------------------------------------------------
// Doctrine v2.7 address-and-heading guard.
// A child who died may be named only in page body text, and only after a Name
// Card passes. No child here has a Name Card. So a name must never reach a page
// title, heading, web address, tracking tag, image text, metadata, structured data, sitemap,
// RSS feed, llms.txt, or a calendar row ID or heading. Names appear in this file
// only as SHA-256 hashes; each comment gives a place and a role, never a person
// or a family.
// ---------------------------------------------------------------------------
// First names that sat inside retired web addresses or row IDs. They are checked
// only inside addresses and IDs, never in prose, because a first name alone can
// be an ordinary word.
const ADDRESS_FIRST_NAME_HASHES=new Set([
  'c35d6aaf3b3885dfc9f36cddf48a65e93a919e13165fbbcfc0f9de5636279559', // Round Lake Beach (Illinois) newborn case: first name in the retired page address
  'cf3a3bbe331c3950d16a8e9917c5bb8340e7c0ef917da25d4a96f92d074bce05', // Brantham (Suffolk) coronial row: first name in the retired row ID
  'af4417c67db4242eba59efa05eee07571b2f1abe6658b5994f3b02d2ebe7a98c', // Anoka County trial-watch row: first name in the retired row ID
]);
// OWNER DECISION PENDING (public-safety alert): /today/ and /missing-persons/
// still show the name of one missing child from the missing-persons list. The
// owner has not decided whether a missing child may be named in a public-safety
// alert, so the guard lets that one name stand on those two pages only. Remove
// this exemption when the owner decides.
const PUBLIC_SAFETY_ALERT_PAGES=new Set(['dist/today/index.html','dist/missing-persons/index.html']);
const PUBLIC_SAFETY_ALERT_HASHES=new Set([
  'ac4e8d3be7aff3adb9f7b9ca340468b46bcb17d25860b1f56942b9e3a413188d', // Brantham (Suffolk) coronial case child: missing-child alert
]);
// Web addresses that carried a child's name and now redirect. Each hash is of the
// lowercase path without its trailing slash. The old path may stay only as the
// source of a 301 in public/_redirects.
const RETIRED_ADDRESS_HASHES=new Set([
  '5111e59adf15d8ca79b02d3dddc8b608edb66d142fe9fd02f4c89489bbbe3e3d', // Frisco (Texas) track-meet verdict post
  'f83159b18d39f6c5627f4261bf8cb73fd4879d504d0b0595ffc6ae5147bea525', // Round Lake Beach (Illinois) newborn case page
  'c95ac64a5500f1b28b76e87000d7f242c6066a35a297382b40ffbc2ba41cfa1c', // Apalachee High School plea-hearing post (defendant charged at 14)
  '96f1614fe4618e77566e08121e077512bd149f9410128c3593cb9354a44d4540', // Vallow case post (two children)
]);

const lettersIn=text=>[...text.matchAll(/[A-Za-z]+/g)].map(m=>m[0].toLowerCase());
// Hashes of protected names found in text. firstNames: also test the first names
// that are checked only in addresses and IDs. skip: hashes allowed on this page.
function protectedNames(text,{firstNames=false,skip=new Set(),words=CALENDAR_WORD_HASHES,pairs=CALENDAR_PAIR_HASHES,names=ADDRESS_FIRST_NAME_HASHES}={}) {
  const list=lettersIn(text);
  const found=[];
  list.forEach((word,i)=>{
    const one=hash(word);
    if(words.has(one)||(firstNames&&names.has(one))) found.push(one);
    const two=i+1<list.length?hash(word+' '+list[i+1]):'';
    if(two&&pairs.has(two)) found.push(two);
  });
  return found.filter(h=>!skip.has(h));
}
// Another site's address (a news link, a Beehiiv product) is that site's text,
// not ours; this guard checks our own surfaces only.
const EXTERNAL_URL=/https?:\/\/(?!(?:www\.)?cassiancreed\.com(?![\w.-]))[^\s"'<>)\\]+/g;
const ownText=text=>text.replace(EXTERNAL_URL,' ');
const stripTags=html=>html.replace(/<[^>]+>/g,' ');
const ownAddress=value=>/^(\/(?!\/)|#|https?:\/\/(www\.)?cassiancreed\.com(?![\w.-]))/.test(value);
// The places a page shows a name outside its article text. Each entry: [kind, text].
function nameSurfaces(html) {
  const found=[];
  const take=(kind,regex,pick)=>{ for(const m of html.matchAll(regex)) found.push([kind,ownText(pick(m))]); };
  take('title',/<title>([\s\S]*?)<\/title>/g,m=>m[1]);
  take('heading',/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/g,m=>stripTags(m[1]));
  take('meta',/<meta\b[^>]*\bcontent="([^"]*)"/g,m=>m[1]);
  take('structured data',/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,m=>m[1]);
  take('image or label text',/\b(?:alt|title|aria-label)="([^"]*)"/g,m=>m[1]);
  take('element ID',/\bid="([^"]*)"/g,m=>m[1]);
  for(const m of html.matchAll(/\b(?:href|src|action|poster)="([^"]*)"/g)) {
    if(ownAddress(m[1])) found.push(['web address',m[1]]);
    // Another site's address is its own text, but the tracking tags we add to
    // its query string (utm_campaign and the like) are ours.
    else if(/^https?:\/\//.test(m[1])&&m[1].includes('?')) found.push(['tracking tag',m[1].slice(m[1].indexOf('?'))]);
  }
  take('tracking tag',/\bdata-nep-[a-z-]+="([^"]*)"/g,m=>m[1]);
  return found;
}
const addressKinds=new Set(['web address','element ID','tracking tag']);
function allFiles(dir) {
  return readdirSync(dir).flatMap(name=>{
    const path=join(dir,name);
    if(statSync(path).isDirectory()) return name==='_astro'?[]:allFiles(path);
    return [path];
  });
}
const builtFiles=allFiles('dist').map(path=>path.replace(/\\/g,'/'));
const builtPages=builtFiles.filter(path=>path.endsWith('.html'));
function namesOnPage(path,html) {
  const skip=PUBLIC_SAFETY_ALERT_PAGES.has(path)?PUBLIC_SAFETY_ALERT_HASHES:new Set();
  const bad=[];
  for(const [kind,text] of nameSurfaces(html)) {
    // Row IDs, web addresses and tracking tags also carry first names; those two pages list
    // missing people by name on purpose, so first names are not tested there.
    const firstNames=addressKinds.has(kind)&&!PUBLIC_SAFETY_ALERT_PAGES.has(path);
    if(protectedNames(text,{firstNames,skip}).length) bad.push(kind);
  }
  return [...new Set(bad)];
}
test('the guard finds a name in each place it must watch, and ignores article text and other sites',()=>{
  const fixture={ words:new Set(),pairs:new Set([hash('zorblax fixture')]),names:new Set([hash('zorblax')]) };
  const html=`<title>Zorblax Fixture</title><h2>About <em>Zorblax</em> Fixture</h2>
    <meta name="description" content="Zorblax Fixture">
    <script type="application/ld+json">{"name":"Zorblax Fixture"}</script>
    <img alt="Zorblax Fixture"><div id="zorblax-fixture"></div>
    <a href="/post/zorblax-fixture/">read</a><a href="https://news.example/zorblax-fixture">other site</a>
    <a href="https://forms.example/f?utm_campaign=baby_zorblax">form</a><div data-nep-campaign="baby_zorblax"></div>
    <p>Zorblax Fixture appears in article text.</p>`;
  const kinds=nameSurfaces(html).filter(([kind,text])=>protectedNames(text,{...fixture,firstNames:addressKinds.has(kind)}).length).map(([kind])=>kind);
  assert.deepEqual([...new Set(kinds)].sort(),['element ID','heading','image or label text','meta','structured data','title','tracking tag','web address'].sort());
  assert.equal(nameSurfaces('<p>Zorblax Fixture</p>').length,0);
  assert.equal(nameSurfaces('<a href="https://news.example/zorblax-fixture">x</a>').length,0);
  assert.equal(protectedNames('Zorblax and Fixture',{...fixture}).length,0,'a pair needs both words in a row');
});
test('no built page puts a child who died in a title, heading, meta tag, structured data, image text, element ID, tracking tag or web address',()=>{
  assert.ok(builtPages.length>100,'Expected the built site, found '+builtPages.length+' pages');
  for(const path of builtPages) {
    assert.deepEqual(namesOnPage(path,readFileSync(path,'utf8')),[],path+' names a protected child outside its article text');
  }
});
test('no built file name, sitemap entry, RSS item, llms.txt line or redirect target names a protected child',()=>{
  for(const path of builtFiles) {
    assert.deepEqual(protectedNames(path.replace(/^dist\//,''),{firstNames:true}),[],path+' has a protected name in its web address');
  }
  for(const path of ['dist/sitemap.xml','dist/rss.xml','dist/llms.txt']) {
    assert.ok(statSync(path).size>200,path+' is missing or empty');
    const text=ownText(readFileSync(path,'utf8'));
    assert.deepEqual(protectedNames(text,{firstNames:true}),[],path+' names a protected child');
  }
  // In _redirects only the source column may keep a retired address.
  for(const line of readFileSync('dist/_redirects','utf8').split(/\r?\n/)) {
    const shown=line.trim().startsWith('#')?line:line.trim().split(/\s+/).slice(1).join(' ');
    assert.deepEqual(protectedNames(shown,{firstNames:true}),[],'a _redirects comment or target names a protected child');
  }
});
test('juveniles charged under 16 are not named anywhere on the built site',()=>{
  for(const path of builtPages.concat(['dist/sitemap.xml','dist/rss.xml','dist/llms.txt'])) {
    const text=ownText(readFileSync(path,'utf8'));
    assert.deepEqual(protectedNames(text,{words:new Set(),pairs:JUVENILE_UNDER_16_PAIR_HASHES}),[],path+' names a juvenile who was charged under 16');
  }
});
// The calendar spreadsheets feed the calendar pages, so check the rows at the
// source too: row IDs, headings and site links must be name-free, and a
// juvenile charged under 16 may appear nowhere except another site's link.
const CALENDAR_SHEETS=[
  ['src/data/court-calendar.tsv',['id','case','internal_link','internal_link2']],
  ['src/data/court-calendar-archive.tsv',['id','case','internal_link','internal_link2']],
  ['src/data/international-watch.tsv',['id','case','internal_link']],
  ['src/data/media-calendar.tsv',['id','title','court_calendar_id']],
];
test('calendar spreadsheet rows keep protected names out of row IDs, headings and site links',()=>{
  for(const [path,columns] of CALENDAR_SHEETS) {
    const [head,...rows]=readFileSync(path,'utf8').split(/\r?\n/).filter(Boolean).map(line=>line.split('\t'));
    assert.ok(rows.length>0,path+' has no rows');
    rows.forEach((row,n)=>{
      const where=path+' line '+(n+2);
      for(const column of columns) {
        // First names are tested in IDs and links only; a heading may name an adult.
        const firstNames=!['case','title'].includes(column);
        assert.deepEqual(protectedNames(row[head.indexOf(column)]||'',{firstNames}),[],where+': '+column+' names a protected child');
      }
      row.forEach((cell,i)=>{
        if(/^source2?_url$/.test(head[i])) return;
        assert.deepEqual(protectedNames(cell,{words:new Set(),pairs:JUVENILE_UNDER_16_PAIR_HASHES}),[],where+': '+head[i]+' names a juvenile who was charged under 16');
      });
    });
  }
});
test('retired child-name addresses 301 to role-based pages that exist',()=>{
  const key=path=>path.toLowerCase().replace(/\/+$/,'');
  const rules=readFileSync('public/_redirects','utf8').split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('#')).map(line=>line.split(/\s+/));
  const seen=new Map();
  for(const [from,to,status] of rules) {
    const id=hash(key(from));
    if(!RETIRED_ADDRESS_HASHES.has(id)) continue;
    assert.match(status||'',/^301!?$/,'a retired address must use a 301');
    assert.deepEqual(protectedNames(to,{firstNames:true}),[],'a retired address redirects to an address that names a protected child');
    assert.ok(existsSync(join('dist',to,'index.html')),'a retired address redirects to a page that was not built: '+to);
    seen.set(id,(seen.get(id)||0)+1);
  }
  for(const id of RETIRED_ADDRESS_HASHES) {
    assert.ok((seen.get(id)||0)>=2,'a retired address needs two 301 lines (with and without the trailing slash); hash '+id.slice(0,8));
  }
});
