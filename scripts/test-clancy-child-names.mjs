import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
// No-child-names rule: NEP never names a child victim. Runs after Astro builds,
// so missing output is a failure, never a silent skip.
// The Clancy children's first names are stored only as SHA-256 hashes of the
// lowercase word, so this public test file never spells them out.
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
