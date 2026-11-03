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
  'e272a9a3741641035eaab8f23e251ea960c3a62d02d55cfa31204a8545cbfe7e', // 1979 SoHo (New York) disappearance: boy (6), family name
  '97b172a5e233b2f23d3d416ad3b43462e61ca33326a16bcabbe45210519fe9d5', // New Boston (Texas) case: newborn daughter, first name
  '9ac565be51857cbde1c820d9afc8c67c602663f41f8077c4627c901cf6a92ce0', // Boulder (Colorado) unsolved homicide: child (6), first name
  '9e0a936ccd6d41353eb5ad06d147219aee09097231f892a417688b07150ece9d', // Boulder (Colorado) unsolved homicide: child (6), first name as it splits around an accented letter
]);
// A juvenile charged with a crime under age 16 is never named anywhere on the
// site: not in a title, heading, address, ID or in the article text.
const JUVENILE_UNDER_16_PAIR_HASHES=new Set([
  '4b3df2a38155760d64f874d4f5fc79146b3b2518ccab8db875d274518a904585', // Apalachee High School shooting: defendant charged at 14, first and family name
  '51c2557a6c8f30a6f5bc1303488423bfe4413fbd4a593d1faf2118a23736cdca', // Chippewa County homicide case: defendant charged at 14, first name and first family name
  'd25eea619d295c8844a9481be56491c0947eaee43aa358fa700338ddae2e60f3', // Chippewa County homicide case: defendant charged at 14, the two family names
]);
// A living child is never named. First and family name together are checked on
// every built page (text included) and in the spreadsheets. See the page-scoped
// first-name check further down.
const LIVING_CHILD_PAIR_HASHES=new Set([
  '760f737bac965241cb4049fab5f028097e6a316534d039a2cf95042ef94ddd19', // Frisco (Texas) track-meet case: the victim's living twin brother, first and family name
]);
const CALENDAR_PAIR_HASHES=new Set([
  ...JUVENILE_UNDER_16_PAIR_HASHES,
  ...LIVING_CHILD_PAIR_HASHES,
  '0aa09f4887d655ee0425c0371adfad190d3128d07585952ff87b2f0f8d21496f', // Los Angeles murder case rows: victim (14), family names
  '1a1c6e7377be6efed9aceac1e24a4eb92d244d58df264c5d28b9141664d1dc13', // Chippewa County case victim
  '36376b8d6cbf6d302ac5cce63811ec62d93efe66e28c08c8462a7f9a6650f103', // Saratoga Springs case child victim
  'be3aae4585ddd63c50de1fd9fde6d2cdba5ae082b5f7618c2602773c5e5c4793', // Round Lake Beach (Illinois) newborn case: the name the infant was known by
  '868c3396c2ea352fdd7917327c7a186a65922c089081b2026af0193fcedcad5c', // Frisco (Texas) track-meet case: victim (17)
  'ac4e8d3be7aff3adb9f7b9ca340468b46bcb17d25860b1f56942b9e3a413188d', // Brantham (Suffolk) coronial case child
  '1b1e3f1122c3188fc7068cfc0eabac30ac70e73c3df36c786f88a5f0bfa02371', // Apalachee shooting student victim
  'bb70416bf82131c672b41b711d674e9ec94e931934981b5306cd1562dafc2cc6', // Anoka County trial-watch row: teen victim
  '1ae26652fce06a69c7d90c77e3f24da3c270fbe1565f2069b9db7d22efe0b809', // 1979 SoHo (New York) disappearance: boy (6), first and family name
  'e1f8f44e9c55a7e7f7cc3b0a3602e536b728a69277e0b60b1771e4b8e067f776', // Delphi (Indiana) case: girl (13), first and family name
  'f057f391ba66477ba5a5a6ddd3fbd0ec03afc4fccb9d9f83302d8c5c97956eaa', // Delphi (Indiana) case: girl (14), first and family name
  '01cb5060aafe21ff499ba2b49010774ed4483a1059d109fc0e769d3cf9f95eef', // Clinton County (Iowa) 1975 Jane Doe: girl (15), first and middle name
  '2518f8177d008335523fe31f41bb68b26ffd739ca5b6d9015160ee7348c34ca9', // Clinton County (Iowa) 1975 Jane Doe: girl (15), middle and family name
  '6e6bd29552dc5b649f924d60538c7916b10a16c71326662d275b8fc756c35da8', // New Boston (Texas) case: newborn daughter, first and middle name
  '088f5651028191ac0ed572a1bfe9b9c8544fa091149dfd8d70bd34d7f3af3609', // New Boston (Texas) case: newborn daughter, middle and family name
  'c475e9ebbaa39f484e82da4afff461eab90b6b88739596bebe214d00953ac01c', // Maricopa County (Arizona) teen homicide: victim (16), first and family name
  '21145875513d58636bd392a4b90db6c9b0b8c94a3ace63fdd0709ac35fb3f381', // Boulder (Colorado) unsolved homicide: child (6), first and family name
]);
// ---- The hand-kept list of protected children ---------------------------------------
// src/data/protected-children.hashes holds children the data cannot flag on its own (no age
// is written beside the name). Hashes only; each line has a role comment and no name. Two
// sections:
//   [surface]    the name may appear in article text only, and only because its Name
//                Card passed. Anywhere else it fails (title, heading, meta, address, ...).
//   [everywhere] the Name Card did not pass (FAIL or UNSURE). The name fails everywhere,
//                article text included. A line may end its hash with @<hash of a page
//                path> to apply only on that page (for a first name that is also an
//                ordinary name, like a first name used alone).
// A hash is of a lowercase word, or of two words in a row with a space between them, with
// accents removed. The same hash can be used for a word or a pair.
const PROTECTED_LIST_PATH='src/data/protected-children.hashes';
function parseProtectedList(text) {
  const list={surface:new Set(),everywhere:new Set(),scoped:new Map(),problems:[]};
  let section='';
  text.split(/\r?\n/).forEach((line,n)=>{
    const trimmed=line.trim();
    if(!trimmed||trimmed.startsWith('#')) return;
    const header=trimmed.match(/^\[(surface|everywhere)\]$/);
    if(header) { section=header[1]; return; }
    const m=trimmed.match(/^([0-9a-f]{64})(?:@([0-9a-f]{64}))?\s+#\s+(\S.{9,})$/);
    if(!m||!section||(m[2]&&section!=='everywhere')) { list.problems.push('line '+(n+1)); return; }
    if(m[2]) { if(!list.scoped.has(m[2])) list.scoped.set(m[2],new Set()); list.scoped.get(m[2]).add(m[1]); }
    else list[section].add(m[1]);
  });
  return list;
}
const PROTECTED_LIST=parseProtectedList(existsSync(PROTECTED_LIST_PATH)?readFileSync(PROTECTED_LIST_PATH,'utf8'):'');
// Every listed hash is also protected on the surfaces the other lists protect. A first name
// that is also an ordinary name (the page-scoped lines) is checked on its one page only.
for(const id of [...PROTECTED_LIST.surface,...PROTECTED_LIST.everywhere]) {
  CALENDAR_WORD_HASHES.add(id);
  CALENDAR_PAIR_HASHES.add(id);
}
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
//
// What is protected, in three layers:
//   1. Hashes found by hand (the lists below).
//   2. Names the guard reads from the site's own data on every run: a name beside an
//      age under 18 in the posts and calendar sheets (see "Protected names built from
//      the site's own data"), and the children in active missing-person alerts.
//   3. Retired page addresses and calendar row IDs, which may not come back.
// What is read: every attribute of every element, every link to our own site
// (cassiancreed.com AND our Beehiiv store, cassiancreed.beehiiv.com), data inside
// scripts, script files, the sitemap, RSS feed, llms.txt and _redirects.
//
// Only ONE owner allowlist is left. It is marked, small and tested to be in use:
//   OWNER RENAME PENDING (Beehiiv handles): two product addresses on our Beehiiv store.
// Living children in missing-person alerts follow a rule, not an allowlist (see "The
// missing-child alert rule" below), and may be named on /missing-persons/ and /today/ only.
// Another site's link (a news story, a police release) is that site's text, not ours.
// ---------------------------------------------------------------------------
// First names that sat inside retired web addresses or row IDs. They are checked
// only inside addresses and IDs, never in prose, because a first name alone can
// be an ordinary word.
const ADDRESS_FIRST_NAME_HASHES=new Set([
  'c35d6aaf3b3885dfc9f36cddf48a65e93a919e13165fbbcfc0f9de5636279559', // Round Lake Beach (Illinois) newborn case: first name in the retired page address
  'cf3a3bbe331c3950d16a8e9917c5bb8340e7c0ef917da25d4a96f92d074bce05', // Brantham (Suffolk) coronial row: first name in the retired row ID
  'af4417c67db4242eba59efa05eee07571b2f1abe6658b5994f3b02d2ebe7a98c', // Anoka County trial-watch row: first name in the retired row ID
  'e9a63a4eb15738ae85cd416221c8fcc4ccc0018fac91335b42eaa016c76e87f9', // Frisco (Texas) track-meet case: the victim's living twin brother, first name (also checked in that post's text, below)
  '6d667067b13775eef94459be1c8229ffff7248d70299b847aef97bbbc66de96b', // 1979 SoHo (New York) disappearance: boy (6), first name
  '3614f7e180d9000547fe4b19cbdb4d222cdd4d4675a023588a69fbe2d1140189', // Delphi (Indiana) case: girl (13), first name
  '7cf7b152874767a5b190cd48117669627a549810cc5768f638642ff021e8293a', // Delphi (Indiana) case: girl (14), first name
  '9c0e126a9f0375702fc470f76553b6d09047271297fc6ca114e56b0120906f5c', // Clinton County (Iowa) 1975 Jane Doe: girl (15), first name
  '27511e620b42e8fbec37edf4bfc765d490f326137a40a51837184f61b8aae39f', // Maricopa County (Arizona) teen homicide: victim (16), first name
]);
// The living twin's first name alone is also checked in the article text of the
// Frisco post. It is not checked in every article: the same first name is an
// ordinary name for adults in other cases. The page is picked by the hash of its
// path (lowercase, no trailing slash), like the retired addresses below.
const LIVING_CHILD_FIRST_NAME_HASHES=new Set([
  'e9a63a4eb15738ae85cd416221c8fcc4ccc0018fac91335b42eaa016c76e87f9', // Frisco (Texas) track-meet case: the victim's living twin brother, first name
]);
const LIVING_CHILD_TEXT_PAGE_HASHES=new Set([
  '5a226f7662f6926847b47a534d2aa1e00786c17d115dde37747d2a44e6620e3c', // Frisco (Texas) track-meet verdict post
]);
// /today/ and /missing-persons/ list missing people by name on purpose. A LIVING
// child in an ACTIVE alert may be named there under the alert rule below, so first
// names are not tested inside addresses and IDs on those two pages. A child who was
// found, alive or dead, or whose alert has no active official poster, is role-only
// on these pages like everywhere else.
const MISSING_PERSON_LIST_PAGES=new Set(['dist/today/index.html','dist/missing-persons/index.html']);
// A child who was found dead after a missing-person alert is named nowhere in our
// own text: not on the alert pages, not in the calendar, not in an address.
const FOUND_DEAD_CHILD_PAIR_HASHES=new Set([
  'ac4e8d3be7aff3adb9f7b9ca340468b46bcb17d25860b1f56942b9e3a413188d', // Brantham (Suffolk) coronial case child, first and family name
]);
// Web addresses that carried a child's name and now redirect. Each hash is of the
// lowercase path without its trailing slash. The old path may stay only as the
// source of a 301 in public/_redirects.
const RETIRED_ADDRESS_HASHES=new Set([
  '5111e59adf15d8ca79b02d3dddc8b608edb66d142fe9fd02f4c89489bbbe3e3d', // Frisco (Texas) track-meet verdict post
  'f83159b18d39f6c5627f4261bf8cb73fd4879d504d0b0595ffc6ae5147bea525', // Round Lake Beach (Illinois) newborn case page
  'c95ac64a5500f1b28b76e87000d7f242c6066a35a297382b40ffbc2ba41cfa1c', // Apalachee High School plea-hearing post (defendant charged at 14)
  '96f1614fe4618e77566e08121e077512bd149f9410128c3593cb9354a44d4540', // Vallow case post (two children)
  'd3162821c0096c43b299c85add38b4e037f2189669b04792a2a33859e465041f', // Clinton County (Iowa) 1975 Jane Doe FAQ post
  '0e1fc93ccc2af6dc50fb34eddaeb4077a745a20d4a6a31ae2d503530cefad848', // Clinton County (Iowa) 1975 Jane Doe timeline post
  '325420c8c211ff6855912aa270cd1ccd3ef566db17553c7cf8bb23e321d29c77', // Clinton County (Iowa) 1975 Jane Doe study-guide post
  '1ee5dcc70ed37584f9f5ab026a092ffebd415bdc224721519f1bbaffd5168baa', // Clinton County (Iowa) 1975 Jane Doe identification post
  '9099f60720f374f1ca370e66a1390d42205a05106d960a744917b04f42886624', // 1979 SoHo (New York) disappearance post
  '0747067915ddb12c9cde3c258f89229bea56039dd5a942038294a077c553dd42', // Delphi (Indiana) case post
]);
// Calendar row IDs that named a child who died. An ID is a page anchor, so it
// cannot be redirected; it may not come back as an element ID or a #link.
const RETIRED_ROW_ID_HASHES=new Set([
  '2dae06fed85d80b5d3f92fcf1fefd4ee926c5597ee023d3703ec316499ba62dd', // Boulder (Colorado) row
  '25bd32a8e24777687bbb309144cf05867f952d7560d840cd4c86267dc1520dbc', // Muhlenberg County (Kentucky) infant row
  'f6d112190982bddda2919484eafe0c02da7e9b8f47623543ba4c6ab18ff2d1bd', // Maricopa County (Arizona) teen homicide row, joint trial
  '1f654591835b3eee70555e03bf23ba61b3b014f589876f703ed9116f38b67d66', // Maricopa County (Arizona) teen homicide row, severed trial
]);

const lettersIn=text=>[...text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').matchAll(/[A-Za-z]+/g)].map(m=>m[0].toLowerCase());
// Hashes of protected names found in text. firstNames: also test the first names
// that are checked only in addresses and IDs.
function protectedNames(text,{firstNames=false,words=CALENDAR_WORD_HASHES,pairs=PAIRS_WITH_ALERT,names=ADDRESS_FIRST_NAME_HASHES}={}) {
  const list=lettersIn(text);
  const found=[];
  list.forEach((word,i)=>{
    const one=hash(word);
    if(words.has(one)||(firstNames&&names.has(one))) found.push(one);
    const two=i+1<list.length?hash(word+' '+list[i+1]):'';
    if(two&&pairs.has(two)) found.push(two);
  });
  return found;
}
// ---- Protected names built from the site's own data ------------------------------
// The hashes above were found by hand, and a name nobody hashed slipped through.
// So the guard also reads the site's own data and protects every child it finds:
// a name written next to an age under 18 in any post or calendar sheet, in the
// forms "Name (13)", "Name, 6,", "Name was 17 years old", "Name, a 14-year-old" and
// "the 14-year-old Name". A name written beside a charge ("defendant", "charged",
// "convicted" and the like) is a defendant, not a victim, and is left out. Names
// live only in memory while the test runs; nothing prints one. A victim whose age
// the data never states still needs a hash above.
const NAME_WORD="[A-Z][a-z]+(?:[-'\u2019][A-Z]?[a-z]+)*";
const FULL_NAME=`${NAME_WORD}(?: (?:[A-Z]\\.|${NAME_WORD})){0,3}`;
// Words that show a match is a place, a date or a phrase, not a person. A pair that holds one is skipped.
const NOT_A_NAME=new Set('january february march april may june july august september october november december monday tuesday wednesday thursday friday saturday sunday the a an in on at of for and but or as by he she they his her their it this that these those case court judge state day year years age aged mr mrs ms dr jr sr high school college university academy elementary middle county city police sheriff department hospital center church park lake river island beach street avenue road bridge district prison jail federal supreme circuit grand jury trial murder death shooting fire house home'.split(' '));
const PLACEHOLDER_WORDS=new Set(['jane','john','doe','baby','boy','girl','infant','unknown','unidentified']);
// Ages come as digits ("14"), hyphenated ("14-year-old"), or spelled out ("fourteen",
// "five-year-old"). Spelled-out ages count only inside an "N-year-old"-style phrase, so a
// word like "one" in "one of the jurors" is never read as an age. A month age ("11-month-old")
// is a child of age 0.
const AGE_WORDS={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20};
const AGE_WORD_FORMS=Object.keys(AGE_WORDS).flatMap(word=>[word,word[0].toUpperCase()+word.slice(1)]).join('|');
const AGE=`(?<![\\w-])(\\d{1,2}|${AGE_WORD_FORMS})(?![\\w])`;
const ageOf=token=>/^\d/.test(token)?Number(token):(AGE_WORDS[token.toLowerCase()]??99);
const ROLE_NOUN='(?:(?:high school |college |middle school )?(?:student|boy|girl|son|daughter|teen|teenager|child|victim|baby|infant)(?:,|\\s+named|\\s+identified as)?\\s+)?';
const AGE_PATTERNS=[
  {rx:new RegExp(`(${FULL_NAME}) \\(${AGE}\\)`,'g'),name:1,age:2},
  {rx:new RegExp(`(${FULL_NAME}), (\\d{1,2})(?=[,.;)\\s]|$)`,'g'),name:1,age:2},
  {rx:new RegExp(`${AGE}[- ]years?[- ]old ${ROLE_NOUN}(${FULL_NAME})`,'g'),name:2,age:1},
  {rx:new RegExp(`(${FULL_NAME}),? \\(?(?:aged?|age) ${AGE}`,'g'),name:1,age:2},
  {rx:new RegExp(`(${FULL_NAME}), (?:a|an|the) ${AGE}[- ]years?[- ]old`,'g'),name:1,age:2},
  {rx:new RegExp(`(${FULL_NAME}) was ${AGE} years? old`,'g'),name:1,age:2},
  // Babies: "11-month-old Name", "Name, an 11-month-old", "Name was 11 months old".
  {rx:new RegExp(`${AGE}[- ]months?[- ]old ${ROLE_NOUN}(${FULL_NAME})`,'g'),name:2,age:()=>0},
  {rx:new RegExp(`(${FULL_NAME}), (?:a|an|the) ${AGE}[- ]months?[- ]old`,'g'),name:1,age:()=>0},
  {rx:new RegExp(`(${FULL_NAME}) was ${AGE} months old`,'g'),name:1,age:()=>0},
];
// A child named beside "presumed dead", "remains" or another sign of a death, with no age
// written: "the boy, Name, whose remains..." / "Name, a girl, was killed". The sentence must
// carry a death word, and the name must sit right beside a child word.
const DEATH_GATE=/presumed (?:dead|death)|presumed to be dead|\bremains\b|found dead|body was found|\bkilled\b|\bmurdered\b|\bdied\b|death of|disappearance of/i;
const CHILD_NOUN='(?:boy|girl|toddler|infant|baby|newborn|child)';
const CHILD_APPOSITION=[
  new RegExp(`\\b${CHILD_NOUN}(?:,|\\s+named|\\s+called)?\\s+(${FULL_NAME})`,'g'),
  new RegExp(`(${FULL_NAME}),? (?:a|an|the|her|his|their) (?:[a-z-]+ ){0,3}${CHILD_NOUN}\\b`,'g'),
];
const CHARGE_BEFORE=/\b(?:defendant|suspect|accused)\s*$/i;
const CHARGE_AFTER=/^[,;)\s]*(?:(?:who|and he|and she|he|she)\s+)?(?:(?:was|is|were|has been|had been|pleaded|pled)\s+)?(?:charged|accused|arrested|convicted|sentenced|indicted|guilty|not guilty)\b/i;
// The two-word forms a person's name takes in print. A two-word name is one pair. A
// longer name is its first and last word, and its last two words, so a first and
// middle name alone (a common pair) does not flag an adult who shares it.
function namePairs(words) {
  const n=words.length;
  if(n<2) return [];
  if(n===2) return [words.join(' ')];
  return [words[0]+' '+words[n-1],words[n-2]+' '+words[n-1]];
}
const looksLikeName=words=>words.length>=2&&!words.some(word=>NOT_A_NAME.has(word)||PLACEHOLDER_WORDS.has(word));
const plain=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
// Lowercase pairs of every name found beside a child signal: an age under 18 (digits,
// hyphenated or spelled out), or a child word plus a death word. A defendant is left out.
function minorNamePairs(raw) {
  const text=plain(raw);
  const found=new Set();
  const take=(m,group)=>{
    const end=m.index+m[0].length;
    if(CHARGE_BEFORE.test(text.slice(Math.max(0,m.index-40),m.index))||CHARGE_AFTER.test(text.slice(end,end+60))) return;
    let words=(m[group].match(/[A-Za-z]+/g)||[]).map(word=>word.toLowerCase());
    while(words.length&&NOT_A_NAME.has(words[0])) words.shift();
    if(!looksLikeName(words)) return;
    for(const pair of namePairs(words)) found.add(pair);
  };
  for(const {rx,name,age} of AGE_PATTERNS) {
    for(const m of text.matchAll(rx)) {
      const years=typeof age==='function'?age(m):ageOf(m[age]);
      if(years<18) take(m,name);
    }
  }
  for(const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    if(!DEATH_GATE.test(sentence)) continue;
    for(const rx of CHILD_APPOSITION) for(const m of sentence.matchAll(rx)) take({...m,index:text.indexOf(sentence)+m.index,0:m[0]},1);
  }
  return found;
}
function dataTexts() {
  const texts=[];
  for(const name of readdirSync('src/content/posts')) if(/\.mdx?$/.test(name)) texts.push(readFileSync(join('src/content/posts',name),'utf8'));
  for(const name of readdirSync('src/data')) if(/\.tsv$/.test(name)&&!/^missing-persons/.test(name)) texts.push(readFileSync(join('src/data',name),'utf8'));
  return texts;
}
const DERIVED_PAIR_HASHES=new Set(dataTexts().flatMap(text=>[...minorNamePairs(text)]).map(hash));
// ---- The missing-child alert rule (owner decision, November 2, 2026) -----------------
// A LIVING child in an ACTIVE missing-person alert may be named exactly as the official
// poster names them, and the entry must link that official poster: the national center's
// poster page (missingkids.org/poster/...) or a police, sheriff or state patrol .gov page.
// Within one day of the child being found, alive or dead, the entry goes role-only.
//   - Named: status is active AND the entry links an official poster. Allowed on
//     /missing-persons/ and /today/ only (see MISSING_PERSON_LIST_PAGES).
//   - Role-only: a status of found or resolved, or no active official poster (a link
//     whose label says withdrawn, unavailable, former, canceled or absent is no poster).
// The site's data has no age column, so a child entry is found by what the data says:
// a national-center (NCMEC) entry, an entry the agency labels "Missing Child", or a
// government entry that carries a national-center poster or case number. Adult entries
// are not touched by this rule. Built from missing-persons.tsv, not typed by hand.
const ACTIVE_STATUSES=new Set(['missing','endangered','involuntarily_missing','abducted','voluntarily_absent']);
const FOUND_STATUSES=new Set(['located_safe','recovered_deceased','resolved']);
const GONE_LINK_LABEL=/withdrawn|unavailable|former|cancel|absent|no longer|expired|archived/i;
const POSTER_LINK_LABEL=/poster|flyer|notice|alert|bulletin|profile|case page|update|missing[- ]child/i;
const NOT_A_POSTER_LABEL=/contact|directory|annual report|home ?page|main page|feed|search|\blist\b/i;
const LAW_ENFORCEMENT_ADDRESS=/police|sheriff|patrol|wsp|attorneygeneral|public-safety|missing/i;
function officialPosterLink(url,label) {
  if(!url||GONE_LINK_LABEL.test(label||'')) return false;
  let link;
  try { link=new URL(url); } catch { return false; }
  const host=link.hostname.toLowerCase().replace(/^www\./,'');
  if(host==='missingkids.org'&&link.pathname.startsWith('/poster/')) return true;
  return host.endsWith('.gov')&&LAW_ENFORCEMENT_ADDRESS.test(host+link.pathname)&&POSTER_LINK_LABEL.test(label||'')&&!NOT_A_POSTER_LABEL.test(label||'');
}
function missingRows() {
  const lines=readFileSync('src/data/missing-persons.tsv','utf8').split(/\r?\n/);
  const head=lines[0].split('\t');
  return lines.slice(1).map((line,i)=>({line,number:i+2})).filter(({line})=>line).map(({line,number})=>({...Object.fromEntries(head.map((column,i)=>[column,line.split('\t')[i]||''])),number}));
}
const isChildAlertRow=row=>row.kind==='case'&&(row.source_type==='ncmec'||/^Missing Child/i.test(row.agency_status)||(row.source_type==='government'&&(/NCMEC|Missing Children/i.test(row.case_number)||['source_url','source2_url','tip_url'].some(key=>/missingkids\.org/i.test(row[key])))));
const hasOfficialPoster=row=>officialPosterLink(row.source_url,row.source_label)||officialPosterLink(row.source2_url,row.source2_label);
const CHILD_WORDS=/\b(?:child|children|boy|girl|teen(?:ager)?|juvenile|minor|runaway|infant|baby|toddler|\d{1,2}-year-old)\b/i;
// An entry found or resolved is a child's when the data says so (a child alert row, or a child word in it).
const isFoundChildRow=row=>row.kind==='case'&&FOUND_STATUSES.has(row.status)&&(isChildAlertRow(row)||CHILD_WORDS.test(row.name+' '+row.summary+' '+row.agency_status));
// A name that is role words starts with an article and a lowercase word or an age:
// "A boy from Brantham, Suffolk, found dead", "A 10-year-old boy from ...", "Two children missing from ...".
const ROLE_ONLY_NAME=/^(?:An?|The|Two|Three|Four) (?:\d|[a-z])/;
// Which entries may carry a living child's name, and which must be role-only.
function alertRule(rows) {
  const allowed=[]; const roleOnly=[];
  for(const row of rows) {
    if(isChildAlertRow(row)&&ACTIVE_STATUSES.has(row.status)&&hasOfficialPoster(row)) allowed.push(row);
    else if(isChildAlertRow(row)||isFoundChildRow(row)) roleOnly.push(row);
  }
  return {allowed,roleOnly};
}
const pairsOfName=name=>{
  const found=[];
  for(const person of name.split(/ and /)) found.push(...namePairs((plain(person).match(/[A-Za-z]+/g)||[]).filter(word=>word.length>1).map(word=>word.toLowerCase())));
  return found;
};
const ALERT_RULE=alertRule(missingRows());
const ALERT_PAIR_HASHES=new Set(ALERT_RULE.allowed.flatMap(row=>pairsOfName(row.name)).map(hash));
// A role-only entry that still carries a name is blocked on every page, the alert pages too.
const BLOCKED_ALERT_PAIR_HASHES=new Set(ALERT_RULE.roleOnly.filter(row=>!ROLE_ONLY_NAME.test(row.name)).flatMap(row=>pairsOfName(row.name)).map(hash));
const PAIRS_EVERYWHERE=new Set([...CALENDAR_PAIR_HASHES,...DERIVED_PAIR_HASHES,...BLOCKED_ALERT_PAIR_HASHES]);
const PAIRS_WITH_ALERT=new Set([...PAIRS_EVERYWHERE,...ALERT_PAIR_HASHES]);
// Another site's address (a news link) is that site's text, not ours. Our Beehiiv
// store (cassiancreed.beehiiv.com) is OURS: its addresses, keys and tracking tags
// are checked like any other of our surfaces.
const EXTERNAL_URL=/https?:\/\/(?!(?:www\.)?cassiancreed\.com(?![\w.-])|cassiancreed\.beehiiv\.com(?![\w.-]))[^\s"'<>)\\]+/g;
// OWNER RENAME PENDING (Beehiiv handles): two paid-guide product pages on our
// Beehiiv store still carry a child victim's name in their address. The owner has
// to rename them in Beehiiv; until then those two exact product addresses (the
// path only; the query string is still checked) are the ONLY names allowed in a
// link. Each entry is the hash of the lowercase product path. Delete an entry
// once the handle is renamed; the test below fails if an entry is no longer used.
const OWNER_RENAME_PENDING_BEEHIIV_PATH_HASHES=new Set([
  'c85fc1d3bf6bba2dd3d25e853819274cf7b470090f0da604c1f004d622d91900', // paid guide for the Frisco (Texas) track-meet case (victim, 17)
  'bf8fcaa89742b9d1b703bbb28630e93fe0324840184ba25a184d1796185c6ea2', // paid guide for the Los Angeles case (victim, 14)
]);
const BEEHIIV_PRODUCT=/https?:\\?\/\\?\/cassiancreed\.beehiiv\.com\\?\/products\\?\/([A-Za-z0-9_-]+)/g;
// An allowed product address becomes a neutral one of the same shape, so its query string is still checked.
const allowPendingHandles=(text,allowed=OWNER_RENAME_PENDING_BEEHIIV_PATH_HASHES)=>text.replace(BEEHIIV_PRODUCT,(all,handle)=>allowed.has(hash('/products/'+handle))?'https://cassiancreed.beehiiv.com/products/owner-rename-pending':all);
const ownText=text=>text.replace(EXTERNAL_URL,' ');
const stripTags=html=>html.replace(/<[^>]+>/g,' ');
const ownAddress=value=>/^(\/(?!\/)|#|https?:\/\/(www\.)?cassiancreed\.com(?![\w.-])|https?:\/\/cassiancreed\.beehiiv\.com(?![\w.-]))/.test(value);
// Slug-like tokens (hyphenated or underscored words) are how names ride along in
// keys, IDs and addresses, inside scripts and data as well as in attributes.
const slugTokens=text=>(text.match(/[A-Za-z0-9]+(?:[-_][A-Za-z0-9]+)+/g)||[]).join(' ');
const looksLikeKey=value=>/^[A-Za-z0-9][A-Za-z0-9_:\/.#?=&%-]*$/.test(value);
// Attributes that hold layout, not words or names.
const SKIP_ATTRIBUTES=new Set(['class','style','d','points','viewbox','transform','fill','stroke','width','height','rel','target','type','lang','charset','media','sizes','loading','decoding','crossorigin','referrerpolicy','role','tabindex','method','enctype','autocomplete']);
const ADDRESS_ATTRIBUTES=new Set(['href','src','action','poster','cite','formaction','data-href','data-url','data-src']);
const ID_ATTRIBUTES=new Set(['id','for','aria-labelledby','aria-describedby','aria-controls','headers','list','form']);
const LABEL_ATTRIBUTES=new Set(['alt','title','aria-label','placeholder']);
// The places a page shows a name outside its article text. Each entry: [kind, text].
// EVERY attribute of every element is read, not a short list: data-* keys, preview
// keys and the like are surfaces too.
function nameSurfaces(html) {
  const found=[];
  const take=(kind,regex,pick)=>{ for(const m of html.matchAll(regex)) found.push([kind,ownText(pick(m))]); };
  take('title',/<title>([\s\S]*?)<\/title>/g,m=>m[1]);
  take('heading',/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/g,m=>stripTags(m[1]));
  take('meta',/<meta\b[^>]*\bcontent="([^"]*)"/g,m=>m[1]);
  take('structured data',/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,m=>m[1]);
  // Scripts and embedded data: keys and addresses only (their prose is article text).
  for(const m of html.matchAll(/<script\b(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g)) found.push(['script key',slugTokens(ownText(m[1]))]);
  for(const tag of html.matchAll(/<[a-zA-Z][^>]*>/g)) {
    for(const a of tag[0].matchAll(/([^\s"'<>\/=]+)\s*=\s*"([^"]*)"/g)) {
      const name=a[1].toLowerCase();
      const value=a[2];
      if(SKIP_ATTRIBUTES.has(name)) continue;
      if(ADDRESS_ATTRIBUTES.has(name)||name==='srcset') {
        for(const url of name==='srcset'?value.split(',').map(part=>part.trim().split(/\s+/)[0]):[value]) {
          if(ownAddress(url)) found.push(['web address',url]);
          // Another site's address is its own text, but the tracking tags we add to
          // its query string (utm_campaign and the like) are ours.
          else if(/^https?:\/\//.test(url)&&url.includes('?')) found.push(['tracking tag',url.slice(url.indexOf('?'))]);
        }
      }
      else if(ID_ATTRIBUTES.has(name)) found.push(['element ID',value]);
      else if(name.startsWith('data-nep-')) found.push(['tracking tag',ownText(value)]);
      else if(LABEL_ATTRIBUTES.has(name)) found.push(['image or label text',ownText(value)]);
      else if(name==='content'||name==='name') continue; // meta content is read above; form field names are not words
      else found.push([looksLikeKey(value)?'attribute key':'attribute text',ownText(value)]);
    }
  }
  return found;
}
const addressKinds=new Set(['web address','element ID','tracking tag','attribute key','script key']);
function allFiles(dir) {
  return readdirSync(dir).flatMap(name=>{
    const path=join(dir,name);
    if(statSync(path).isDirectory()) return name==='_astro'?[]:allFiles(path);
    return [path];
  });
}
const builtFiles=allFiles('dist').map(path=>path.replace(/\\/g,'/'));
const builtPages=builtFiles.filter(path=>path.endsWith('.html'));
const retiredRowId=(text,ids=RETIRED_ROW_ID_HASHES)=>text.split(/[\s#/?&=]+/).some(token=>token&&ids.has(hash(token)));
function namesOnPage(path,html) {
  const bad=[];
  // The alert rule: the list pages may show a living child in an active alert that links an official poster.
  const onListPage=MISSING_PERSON_LIST_PAGES.has(path);
  const pairs=onListPage?PAIRS_EVERYWHERE:PAIRS_WITH_ALERT;
  // OWNER RENAME PENDING: the two Beehiiv product addresses are hidden first, wherever they sit
  // (a link, a script's data); the query string after them is still checked.
  for(const [kind,text] of nameSurfaces(allowPendingHandles(html))) {
    // Row IDs, web addresses and tracking tags also carry first names; the missing-person
    // list pages name living missing people on purpose, so first names are not tested there.
    const firstNames=addressKinds.has(kind)&&!onListPage;
    if(protectedNames(text,{firstNames,pairs}).length) bad.push(kind);
    if(retiredRowId(text)) bad.push('retired row ID');
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
  // Collect every page first, so one run lists them all (places only, never a name).
  const bad=builtPages.map(path=>[path,namesOnPage(path,readFileSync(path,'utf8'))]).filter(([,kinds])=>kinds.length);
  assert.deepEqual(bad.map(([path,kinds])=>path+' ('+kinds.join(', ')+')'),[],bad.length+' built pages name a protected child outside their article text');
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
// Names of a living child in article text. The first and family name together are
// banned on every page. The first name alone is banned on the pages picked by
// pagePath hash only (see LIVING_CHILD_TEXT_PAGE_HASHES).
const pageKey=path=>path.replace(/\\/g,'/').replace(/^dist/,'').replace(/\/index\.html$/,'').toLowerCase();
function livingChildNames(path,text,{pairs=LIVING_CHILD_PAIR_HASHES,names=LIVING_CHILD_FIRST_NAME_HASHES,pages=LIVING_CHILD_TEXT_PAGE_HASHES}={}) {
  const onNamedPage=pages.has(hash(pageKey(path)));
  return protectedNames(ownText(text),{words:onNamedPage?names:new Set(),pairs});
}
test('the living-child check finds a name where it must and leaves other pages alone',()=>{
  const fixture={ pairs:new Set([hash('zorblax fixture')]),names:new Set([hash('zorblax')]),pages:new Set([hash('/post/fixture-page')]) };
  const page='dist/post/fixture-page/index.html';
  const other='dist/post/another-page/index.html';
  assert.equal(livingChildNames(page,'<p>His brother Zorblax was there.</p>',fixture).length,1,'first name on the named page');
  assert.equal(livingChildNames(other,'<p>The attorney Zorblax spoke.</p>',fixture).length,0,'first name alone on another page');
  assert.equal(livingChildNames(other,'<p>Zorblax Fixture was there.</p>',fixture).length,1,'first and family name on any page');
  assert.equal(livingChildNames(page,'<a href="https://example.org/zorblax">link</a>',fixture).length,0,'another site\'s link is not our text');
});
test('a living child is not named anywhere on the built site',()=>{
  const pageHashes=new Set();
  for(const path of builtPages.concat(['dist/sitemap.xml','dist/rss.xml','dist/llms.txt'])) {
    pageHashes.add(hash(pageKey(path)));
    assert.deepEqual(livingChildNames(path,readFileSync(path,'utf8')),[],path+' names a living child');
  }
  for(const id of LIVING_CHILD_TEXT_PAGE_HASHES) assert.ok(pageHashes.has(id),'a page picked for the first-name check is not built; update the hash');
});
test('a child who was found dead after a missing-person alert is role-only in our own text',()=>{
  for(const path of builtPages.concat(['dist/sitemap.xml','dist/rss.xml','dist/llms.txt'])) {
    const text=ownText(readFileSync(path,'utf8'));
    assert.deepEqual(protectedNames(text,{words:new Set(),pairs:FOUND_DEAD_CHILD_PAIR_HASHES}),[],path+' names a child who was found dead');
  }
  for(const path of MISSING_PERSON_LIST_PAGES) assert.ok(builtPages.includes(path),path+' is not built');
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

// ---------------------------------------------------------------------------
// The guard checks itself, and the two owner allowlists stay small and in use.
// ---------------------------------------------------------------------------
test('the guard reads every attribute and link, treats our Beehiiv store as ours, and lets through only the allowed product address',()=>{
  const handle='zorblax-fixture-guide';
  const allowed=new Set([hash('/products/'+handle)]);
  const fixture={ words:new Set(),pairs:new Set([hash('zorblax fixture')]),names:new Set([hash('zorblax')]) };
  const kindsOf=html=>[...new Set(nameSurfaces(allowPendingHandles(html,allowed)).filter(([kind,text])=>protectedNames(text,{...fixture,firstNames:addressKinds.has(kind)}).length).map(([kind])=>kind))].sort();
  const store='https://cassiancreed.beehiiv.com/products/';
  assert.deepEqual(kindsOf(`<a href="${store}${handle}">buy</a>`),[],'the allowed product address passes');
  assert.deepEqual(kindsOf(`<a href="${store}${handle}-v2">buy</a>`),['web address'],'any other product address with the name fails');
  assert.deepEqual(kindsOf(`<a href="${store}${handle}?utm_campaign=zorblax_fixture">buy</a>`),['web address'],'the query string after an allowed address is still checked');
  assert.deepEqual(kindsOf(`<button data-book-key="zorblax-fixture-guide-x" data-preview-for="zorblax-fixture-guide-x">buy</button>`),['attribute key'],'data attributes are read');
  assert.deepEqual(kindsOf(`<script>var cards=[{"url":"${store}${handle}-v2"}];</script>`),['script key'],'a script that carries an address is read');
  assert.deepEqual(kindsOf(`<script>var cards=[{"url":"${store.replace(/\//g,'\\/')}${handle}"}];</script>`),[],'the allowed address passes inside escaped script data too');
  assert.deepEqual(kindsOf('<a href="https://cassiancreed.com/post/zorblax-fixture/">a</a><a href="https://www.cassiancreed.com/post/zorblax-fixture/">b</a>'),['web address'],'our own addresses are read');
  assert.deepEqual(kindsOf('<a href="https://news.example/zorblax-fixture">other site</a>'),[],'another site\'s address is its own text');
  assert.equal(retiredRowId('see #zorblax-row',new Set([hash('zorblax-row')])),true,'a retired row ID is found in a link');
  assert.equal(retiredRowId('zorblax row',new Set([hash('zorblax-row')])),false,'a retired row ID is the whole token');
});
test('names are built from the site\'s own data: a name beside an age under 18 is protected; adults, defendants, places and placeholders are not',()=>{
  const pairs=text=>[...minorNamePairs(text)].sort();
  assert.deepEqual(pairs('Zorblax Fixture (13) was found.'),['zorblax fixture']);
  assert.deepEqual(pairs('The 14-year-old Zorblax Fixture was last seen.'),['zorblax fixture']);
  assert.deepEqual(pairs('Zorblax Fixture, 16, was killed.'),['zorblax fixture']);
  assert.deepEqual(pairs('Zorblax Fixture, age 12, was killed.'),['zorblax fixture']);
  assert.deepEqual(pairs('Zorblax Quentin Fixture was 9 years old.'),['quentin fixture','zorblax fixture'],'a long name is its first and last words and its last two');
  assert.deepEqual(pairs('Zorblax Fixture (45) is a witness.'),[],'an adult');
  assert.deepEqual(pairs('Zorblax Fixture, 17, was charged with theft.'),[],'a defendant');
  assert.deepEqual(pairs('The defendant Zorblax Fixture (16) appeared.'),[],'a defendant');
  assert.deepEqual(pairs('Apalachee High School, 14 students spoke.'),[],'a place');
  assert.deepEqual(pairs('Baby Doe (1) was found.'),[],'a placeholder');
  assert.deepEqual(pairs('Texas (12) voted.'),[],'one word is not a name');
  // Spelled-out and hyphenated ages, months, and a child word beside a death word.
  assert.deepEqual(pairs('The five-year-old Zorblax Fixture vanished.'),['zorblax fixture'],'a spelled-out, hyphenated age');
  assert.deepEqual(pairs('Five-year-old Zorblax Fixture vanished.'),['zorblax fixture'],'a spelled-out age at the start of a sentence');
  assert.deepEqual(pairs('Zorblax Fixture, a fourteen-year-old, was found.'),['zorblax fixture']);
  assert.deepEqual(pairs('Zorblax Fixture was fourteen years old.'),['zorblax fixture']);
  assert.deepEqual(pairs('Zorblax Fixture (fourteen) was found.'),['zorblax fixture']);
  assert.deepEqual(pairs('The 11-month-old Zorblax Fixture was found.'),['zorblax fixture'],'a baby');
  assert.deepEqual(pairs('Zorblax Fixture was 11 months old.'),['zorblax fixture'],'a baby');
  assert.deepEqual(pairs('The twenty-one-year-old Zorblax Fixture spoke.'),[],'"one" inside "twenty-one" is not an age');
  assert.deepEqual(pairs('San Antonio, one juror said.'),[],'"one" outside an age phrase is not an age');
  assert.deepEqual(pairs('The remains of the boy Zorblax Fixture were never found.'),['zorblax fixture'],'a child word and "remains"');
  assert.deepEqual(pairs('Zorblax Fixture, the boy, was presumed dead.'),['zorblax fixture'],'a child word and "presumed dead"');
  assert.deepEqual(pairs('The girl Zorblax Fixture won a prize.'),[],'a child word without a death word');
  assert.deepEqual(pairs('Zorblax Fixture, a man, was killed.'),[],'an adult');
  assert.ok(DERIVED_PAIR_HASHES.size>=1,'the data produced no names at all; the age patterns may have broken');
});
test('the one owner allowlist is the marked Beehiiv one and is still in use; alert names follow the alert rule',()=>{
  // 1. OWNER RENAME PENDING (Beehiiv handles): two product addresses, each still linked.
  assert.equal(OWNER_RENAME_PENDING_BEEHIIV_PATH_HASHES.size,2,'only the two pending Beehiiv product addresses may be allowed');
  const linked=new Set();
  for(const path of builtPages) for(const m of readFileSync(path,'utf8').matchAll(BEEHIIV_PRODUCT)) linked.add(hash('/products/'+m[1]));
  for(const id of OWNER_RENAME_PENDING_BEEHIIV_PATH_HASHES) assert.ok(linked.has(id),'an allowed Beehiiv address is no longer linked; delete its entry (hash '+id.slice(0,8)+')');
  // 2. The alert rule (not an allowlist): living children in active alerts with an official poster, on two pages only.
  assert.deepEqual([...MISSING_PERSON_LIST_PAGES].sort(),['dist/missing-persons/index.html','dist/today/index.html']);
  assert.ok(ALERT_PAIR_HASHES.size>=20,'the alert list was not built from missing-persons.tsv');
  for(const path of MISSING_PERSON_LIST_PAGES) {
    const shown=protectedNames(ownText(readFileSync(path,'utf8')),{words:new Set(),pairs:ALERT_PAIR_HASHES}).length;
    assert.ok(shown>0,path+' no longer shows an alert name; the allowance for it is stale');
  }
});
test('an official poster is the national center\'s poster page or a police .gov notice; a withdrawn poster, a contact page or a non-.gov site is none',()=>{
  assert.equal(officialPosterLink('https://www.missingkids.org/poster/NCMC/1000001/1','NCMEC missing-child poster'),true);
  assert.equal(officialPosterLink('https://www.missingkids.org/poster/USVA/VA26-0001/1','Virginia clearinghouse missing-child poster'),true);
  assert.equal(officialPosterLink('https://www.missingkids.org/poster/NCMC/1000001/1','Withdrawn NCMEC poster'),false,'a withdrawn poster is not active');
  assert.equal(officialPosterLink('https://www.missingkids.org/poster/NCMC/1000001/1','Unavailable NCMEC poster'),false);
  assert.equal(officialPosterLink('https://www.missingkids.org/gethelpnow/search','NCMEC search page'),false,'only a poster page counts');
  assert.equal(officialPosterLink('https://sheriff.example.gov/alerts/missing-child','County Sheriff missing-child notice'),true);
  assert.equal(officialPosterLink('https://www.example.gov/police','Example Police Department'),false,'a department home page is not a poster');
  assert.equal(officialPosterLink('https://www.example.gov/police/contact','Police contact page'),false);
  assert.equal(officialPosterLink('https://es.example.gov/alerts/x/','Canceled State Patrol alert'),false,'a canceled alert is not active');
  assert.equal(officialPosterLink('https://www.examplesheriff.org/missing','Sheriff missing-child notice'),false,'the site must be .gov');
  assert.equal(officialPosterLink('','NCMEC missing-child poster'),false);
});
test('alert rule: a living child in an active alert with an official poster may be named; every other child entry is role-only; adult entries are left alone',()=>{
  const row=(over)=>({kind:'case',id:'x',name:'Zorblax Fixture',status:'missing',agency_status:'Missing Child',source_type:'ncmec',case_number:'NCMEC 1',source_url:'https://www.missingkids.org/poster/NCMC/1/1',source_label:'NCMEC missing-child poster',source2_url:'',source2_label:'',tip_url:'',summary:'x',...over});
  const ids=rows=>alertRule(rows).allowed.map(r=>r.id).join()+'|'+alertRule(rows).roleOnly.map(r=>r.id).join();
  assert.equal(ids([row({id:'a'})]),'a|','active, poster linked: may be named');
  assert.equal(ids([row({id:'b',source_label:'Withdrawn NCMEC poster'})]),'|b','poster withdrawn: role-only');
  assert.equal(ids([row({id:'c',source_url:'https://news.example/story',source_label:'News story'})]),'|c','no official poster link: role-only');
  assert.equal(ids([row({id:'d',status:'located_safe'})]),'|d','found safe: role-only, even with the poster link');
  assert.equal(ids([row({id:'e',status:'recovered_deceased'})]),'|e','found dead: role-only');
  assert.equal(ids([row({id:'f',status:'located_safe',source_type:'investigating_agency',agency_status:'Located safe',summary:'The teenager was found.'})]),'|f','found child (a child word in the entry): role-only');
  assert.equal(ids([row({id:'g',status:'located_safe',source_type:'investigating_agency',agency_status:'Located safe',summary:'She was found.'})]),'|','found adult: left alone');
  assert.equal(ids([row({id:'h',source_type:'investigating_agency',agency_status:'Missing',source_url:'https://www.fbi.gov/wanted/kidnap/x',source_label:'FBI missing-person poster'})]),'|','adult entry: left alone');
  assert.equal(ids([row({id:'i',source_type:'tribal_authority',agency_status:'Open',source_url:'https://www.bia.gov/x',source_label:'BIA case profile'})]),'|','age not stated: left alone');
  assert.equal(ids([row({id:'j',source_type:'government',agency_status:'Missing',case_number:'Virginia Missing Children\'s Clearinghouse VA26-1'})]),'j|','a clearinghouse child entry with its poster: may be named');
  assert.equal(ids([row({id:'k',source_type:'government',agency_status:'Missing',case_number:'Sheriff 55',source_url:'https://wsp.example.gov/list.pdf',source_label:'WSP list'})]),'|','a government list that does not say child: left alone');
  for(const name of ['A boy from Brantham, Suffolk, found dead September 2026','A 10-year-old boy from Los Angeles, California, located in good health October 2026','Two children missing from Redmond, Washington, since December 2023','A child missing from Naugatuck, Connecticut, since August 2026']) assert.equal(ROLE_ONLY_NAME.test(name),true,name);
  for(const name of ['Zorblax Fixture','A. J. Fixture','Zorblax Fixture and Quentin Fixture','The Fixture family']) assert.equal(ROLE_ONLY_NAME.test(name),false,name);
});
test('in missing-persons.tsv a child entry without an active official poster, and a found child entry, carries role words and no name',()=>{
  const {allowed,roleOnly}=ALERT_RULE;
  assert.ok(allowed.length>=20,'the alert rule found almost no named alerts; the data or the rule may have broken');
  const named=roleOnly.filter(row=>!ROLE_ONLY_NAME.test(row.name)).map(row=>row.number);
  assert.deepEqual(named,[],'lines '+named.join(', ')+' of missing-persons.tsv name a child who has no active official poster or was found: use role words, or add the poster link');
  for(const row of roleOnly) assert.equal(row.id,row.follow_key,'line '+row.number+': a role-only entry keeps one key for its ID and follow key');
  for(const row of ALERT_RULE.allowed) assert.ok(hasOfficialPoster(row)&&ACTIVE_STATUSES.has(row.status),'line '+row.number+': a named alert needs an active status and an official poster link');
});
// Script files can carry keys and addresses too (the calendar's data, for one).
function scriptFiles(dir) {
  return readdirSync(dir).flatMap(name=>{
    const path=join(dir,name).replace(/\\/g,'/');
    if(statSync(path).isDirectory()) return scriptFiles(path);
    return /\.m?js$/.test(name)?[path]:[];
  });
}
test('built script files keep protected names out of their keys and addresses',()=>{
  const bad=[];
  for(const path of scriptFiles('dist')) {
    const tokens=slugTokens(allowPendingHandles(ownText(readFileSync(path,'utf8'))));
    if(protectedNames(tokens,{firstNames:true}).length||retiredRowId(tokens)) bad.push(path);
  }
  assert.deepEqual(bad,[],'a built script file names a protected child');
});

// ---------------------------------------------------------------------------
// Children whose Name Card did not pass are named nowhere, article text included.
// ---------------------------------------------------------------------------
function bodyBanHits(path,text,list=PROTECTED_LIST) {
  const ids=new Set(list.everywhere);
  for(const id of list.scoped.get(hash(pageKey(path)))||[]) ids.add(id);
  return protectedNames(allowPendingHandles(ownText(text)),{words:ids,pairs:ids,firstNames:false});
}
test('the protected-children list file reads cleanly: every line is a hash with a role comment',()=>{
  assert.ok(existsSync(PROTECTED_LIST_PATH),PROTECTED_LIST_PATH+' is missing');
  assert.deepEqual(PROTECTED_LIST.problems,[],'these lines of '+PROTECTED_LIST_PATH+' are not "hash  # role comment" under a [surface] or [everywhere] heading');
  assert.ok(PROTECTED_LIST.surface.size+PROTECTED_LIST.everywhere.size>0,PROTECTED_LIST_PATH+' lists no child');
});
test('the list file understands sections, page scope and role comments',()=>{
  const a=hash('zorblax fixture');
  const b=hash('quentin');
  const list=parseProtectedList(`# note\n[surface]\n${a}  # fixture child, first and family name\n[everywhere]\n${b}@${hash('/post/fixture-page')}  # fixture child, first name on one page\n${a} no comment\n`);
  assert.deepEqual([...list.surface],[a]);
  assert.deepEqual([...list.scoped.get(hash('/post/fixture-page'))],[b]);
  assert.equal(list.problems.length,1,'a line without a role comment is a problem');
  assert.equal(parseProtectedList(`[surface]\n${a}@${b}  # a scoped line is not allowed here\n`).problems.length,1);
  const ban=parseProtectedList(`[everywhere]\n${a}  # fixture child, first and family name\n${b}@${hash('/post/fixture-page')}  # fixture child, first name on one page\n`);
  assert.equal(bodyBanHits('dist/post/other/index.html','<p>Zorblax Fixture and Quentin.</p>',ban).length,1,'the pair fails in article text; the scoped first name does not fail on another page');
  assert.equal(bodyBanHits('dist/post/fixture-page/index.html','<p>Quentin spoke.</p>',ban).length,1,'the scoped first name fails on its page');
  assert.equal(bodyBanHits('dist/post/other/index.html','<a href="https://news.example/zorblax-fixture">x</a>',ban).length,0,'another site\'s address is its own text');
});
test('a child whose Name Card did not pass is named nowhere on the built site, article text included',()=>{
  const bad=[];
  for(const path of builtPages.concat(['dist/sitemap.xml','dist/rss.xml','dist/llms.txt'])) {
    if(bodyBanHits(path,readFileSync(path,'utf8')).length) bad.push(path);
  }
  assert.deepEqual(bad,[],bad.length+' built files name a child whose Name Card did not pass');
});
