import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
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
const CALENDAR_PAIR_HASHES=new Set([
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
