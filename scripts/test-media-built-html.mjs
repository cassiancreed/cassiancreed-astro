import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
// Runs after Astro builds, so missing output is a failure, never a silent skip.
const html=readFileSync('dist/true-crime-watch-calendar/index.html','utf8');
const text=value=>value.replace(/<[^>]*>/g,' ').replace(/&#(?:39|x27);|&apos;/gi,"'").replace(/&quot;/g,'"').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
function article(id) {
  const match=html.match(new RegExp('<article\\b[^>]*\\bid="'+id+'"[^>]*>[\\s\\S]*?<\\/article>'));
  assert.ok(match,'Missing built entry '+id);
  return match[0];
}
function paragraphs(id) {
  return [...article(id).matchAll(/<p\b[^>]*class="watch-status"[^>]*>([\s\S]*?)<\/p>/g)].map(m=>text(m[1]));
}
test('built media HTML never exposes internal verification codes or blanket verification claims',()=>{
  assert.doesNotMatch(html,/V-OFF|V-TRADE|UNCONF|Verified: official source/);
});
test('built media HTML carries exact, limited source caveats',()=>{
  const expected={
    'media-01':'The episode time comes from trade sources.',
    'media-13':'The episode time comes from trade sources.',
    'media-08':'The Oct 21 date comes from a trade listing.',
    'media-09':'The Oct 22 date comes from a trade source.',
    'media-s3':'The time slot comes from trade sources.',
    'media-17':'Official text not yet read.',
    'media-22':"Netflix's own page not yet read.",
    'media-s1':'From trade sources.',
    'media-25':'Not yet confirmed by the network.',
  };
  for(const [id,line] of Object.entries(expected)) assert.deepEqual(paragraphs(id),[line],id);
  assert.doesNotMatch(text(html),/Verified: trade or news sources/);
});
test('built legal-status copy, empty topics and source labels follow the review',()=>{
  const alexander=text(article('media-14'));
  assert.ok(alexander.includes('Oren, Alon and Tal Alexander were found guilty by a federal jury in March 2026. Sentencing is set for Oct 27.'));
  assert.doesNotMatch(alexander,/Their convictions stand/);
  for(const id of ['media-s1','media-s2','media-s3']) assert.doesNotMatch(article(id),/<dt[^>]*>Topic<\/dt>/);
  assert.doesNotMatch(html,/Weekly true-crime stories/);
  assert.ok(text(article('media-22')).includes("What's on Netflix →"));
  assert.ok(text(article('media-s2')).includes('ABC →'));
});
