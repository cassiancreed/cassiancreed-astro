import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {hasAge, hashOfName, phrasesWithoutAge, report, reviewedHashes, scan, textBlocks} from './warn-victim-names.mjs';

// The victim-name warning list (scripts/warn-victim-names.mjs) is a warning, never a failure.
// These tests check what it lists and that it always exits 0. The names are made up.
const names = (text, reviewed) => phrasesWithoutAge(text, reviewed).map((hit) => hit.name);

test('a name in a "death of" phrase with no age is listed', () => {
  assert.deepEqual(names('A jury convicted him in the death of Zorblax Fixture on Tuesday.'), ['Zorblax Fixture']);
  assert.deepEqual(names('He is charged with the murder of Zorblax Quimby Fixture.'), ['Zorblax Quimby Fixture']);
  assert.deepEqual(names('The killing of Zorblax Fixture was never solved.'), ['Zorblax Fixture']);
});

test('the possessive form is listed too, and a sentence-opening word is not part of the name', () => {
  assert.deepEqual(names('He was charged in Zorblax Fixture’s death.'), ['Zorblax Fixture']);
  assert.deepEqual(names('After Zorblax Fixture’s death the town marched.'), ['Zorblax Fixture']);
  assert.deepEqual(names('Is Zorblax Fixture’s disappearance linked?'), ['Zorblax Fixture']);
});

test('a block with an age beside the name is not listed', () => {
  assert.deepEqual(names('The death of Zorblax Fixture, 16, was ruled a homicide.'), []);
  assert.deepEqual(names('The death of 16-year-old Zorblax Fixture was ruled a homicide.'), []);
  assert.deepEqual(names('The death of Zorblax Fixture (16) was ruled a homicide.'), []);
  assert.deepEqual(names('Zorblax Fixture, aged 16, was killed. The killing of Zorblax Fixture is unsolved.'), []);
  assert.equal(hasAge('a six-week-old baby'), true);
  assert.equal(hasAge('in 1984 the court sat for 20 days'), false);
});

test('role-only text, places and dates are not listed', () => {
  assert.deepEqual(names('He is charged in the death of a 16-year-old girl.'), []);
  assert.deepEqual(names('The death of a boy shook the town.'), []);
  assert.deepEqual(names('The murder of Texas Rangers was a film plot.'), []);
  assert.deepEqual(names('The killing of June Fifth was a date.'), []);
});

test('a name checked by hand is not listed again', () => {
  const reviewed = reviewedHashes(`# note\n${hashOfName('Zorblax Fixture')}  # adult victim, checked by hand\nnot a hash  # x\n`);
  assert.equal(reviewed.size, 1);
  assert.deepEqual(names('The death of Zorblax Fixture is unsolved.', reviewed), []);
  assert.deepEqual(names('The death of Quimby Fixture is unsolved.', reviewed), ['Quimby Fixture']);
  assert.equal(hashOfName('Zörblax  Fixture'), hashOfName('zorblax fixture'), 'accents, case and spaces do not change the hash');
});

test('page text is read one block at a time, and script text is ignored', () => {
  const html = '<html><body><script>{"text":"death of Zorblax Fixture"}</script><p>The death of Quimby Fixture is unsolved.</p><p>She was 16 years old.</p></body></html>';
  assert.deepEqual(textBlocks(html), ['The death of Quimby Fixture is unsolved.', 'She was 16 years old.']);
  assert.deepEqual(textBlocks('<li>Zorblax&rsquo;s</li>'), ['Zorblax’s']);
});

test('the list marks a child word in the block and shows those names first', () => {
  const dir = mkdtempSync(join(tmpdir(), 'victim-names-'));
  try {
    mkdirSync(join(dir, 'dist'));
    writeFileSync(join(dir, 'dist', 'index.html'), '<p>The death of Alpha Fixture is unsolved.</p><p>The girl at the center: the death of Zeta Fixture.</p>');
    const list = scan(join(dir, 'dist'));
    assert.deepEqual(list.map((item) => item.name), ['Zeta Fixture', 'Alpha Fixture']);
    assert.match(report(list), /Zeta Fixture.*CHILD WORD IN BLOCK/);
    assert.doesNotMatch(report(list).split('\n').find((line) => line.includes('Alpha Fixture')), /CHILD WORD/);
    assert.match(report([]), /none/);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});

test('the command prints warnings and still exits 0', () => {
  const dir = mkdtempSync(join(tmpdir(), 'victim-names-'));
  try {
    mkdirSync(join(dir, 'dist'));
    writeFileSync(join(dir, 'dist', 'index.html'), '<p>The death of Zorblax Fixture is unsolved.</p>');
    const run = spawnSync(process.execPath, [fileURLToPath(new URL('./warn-victim-names.mjs', import.meta.url))], {cwd: dir, encoding: 'utf8'});
    assert.equal(run.status, 0, 'warnings must never fail the build');
    assert.match(run.stdout, /WARNING \(not a failure\): 1 name/);
    assert.match(run.stdout, /death of Zorblax Fixture/);
    rmSync(join(dir, 'dist'), {recursive: true, force: true});
    const none = spawnSync(process.execPath, [fileURLToPath(new URL('./warn-victim-names.mjs', import.meta.url))], {cwd: dir, encoding: 'utf8'});
    assert.equal(none.status, 0);
  } finally { rmSync(dir, {recursive: true, force: true}); }
});
