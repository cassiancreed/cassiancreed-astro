import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseMediaCalendar } from '../src/data/media-calendar-parser.mjs';
// Runs after Astro builds, so missing output is a failure, never a silent skip.
const html=readFileSync('dist/true-crime-watch-calendar/index.html','utf8');
const listedIds=new Set(parseMediaCalendar(readFileSync('src/data/media-calendar.tsv','utf8')).rows.map(r=>r.id));
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
    'media-13':'The episode time comes from trade sources.',
    'media-09':'The Oct 22 date comes from a trade source.',
    'media-s3':'The time slot comes from trade sources.',
    'media-17':'Official text not yet read.',
    'media-19':'The case status comes from news reports.',
    'media-22':"Netflix's own page not yet read.",
    'media-s1':'From trade sources.',
    'media-25':'Not yet confirmed by the network.',
  };
  // A row dropped after its date passes takes its caveat with it.
  for(const [id,line] of Object.entries(expected)) if(listedIds.has(id)) assert.deepEqual(paragraphs(id),[line],id);
  assert.doesNotMatch(text(html),/Verified: trade or news sources/);
});
test('built as-of line shows a clock-read time in Pacific time',()=>{
  assert.match(html,/As of <time datetime="\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?[+-]\d{2}:\d{2}"[^>]*>[A-Z][a-z]+ \d{1,2}, \d{4}, \d{1,2}:\d{2} [AP]M PT<\/time>\./);
});
test('built status-true copy for a person who died before trial',()=>{
  if(!listedIds.has('media-19')) return;
  const row=text(article('media-19'));
  assert.ok(row.includes('He died in jail that December, before a court ruled on his case.'));
  assert.doesNotMatch(row,/justice system missed|double life/);
});
test('built Books page links to the Watch Calendar',()=>{
  assert.match(readFileSync('dist/books/index.html','utf8'),/href="\/true-crime-watch-calendar\/"/);
});
test('built legal-status copy, empty topics and source labels follow the review',()=>{
  // media-14 drops off once Oct 27 has passed; only check its copy while it is listed.
  if(listedIds.has('media-14')) {
    const alexander=text(article('media-14'));
    assert.ok(alexander.includes("Oren, Alon and Tal Alexander were found guilty by a federal jury in March 2026. On Oct. 27, 2026, each was sentenced to 30 years in prison, the U.S. Attorney's Office said."));
    assert.doesNotMatch(alexander,/Their convictions stand/);
  }
  for(const id of ['media-s1','media-s2','media-s3']) assert.doesNotMatch(article(id),/<dt[^>]*>Topic<\/dt>/);
  assert.doesNotMatch(html,/Weekly true-crime stories/);
  assert.ok(text(article('media-22')).includes("What's on Netflix →"));
  assert.ok(text(article('media-s2')).includes('ABC →'));
});
