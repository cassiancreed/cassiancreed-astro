// Viral Watch (Route A) dry run. Runs the real scheduled-function code three
// times (10 minutes apart) on the saved sample in scripts/fixtures/
// viral-watch-sample.json, with a fake network: fake X answers, canned Claude
// answers, and an ntfy catcher. NO network calls: any other URL throws, and the
// global fetch is replaced with a trap. Nothing is sent anywhere.
//
//   node scripts/viral-watch-dryrun.mjs          (prints the walk-through)
//   node scripts/viral-watch-dryrun.mjs --json   (prints the raw results)
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { COLUMNS } from '../src/data/court-calendar-parser.mjs';
import { runViralWatch, readEnv } from '../netlify/functions/viral-watch/viral-watch.mjs';
import { DRAFT_SYSTEM } from '../netlify/functions/viral-watch/council.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, ROOT), 'utf8');

export function sampleCalendarTsv(rows) {
  const meta = [
    { section: 'meta', id: 'last_updated', status: '2026-10-31' },
    { section: 'meta', id: 'page_title', status: 'Sample calendar' },
    { section: 'meta', id: 'page_description', status: 'Sample rows for the Viral Watch dry run' },
  ];
  return [COLUMNS.join('\t'), ...[...meta, ...rows].map((r) => COLUMNS.map((c) => r[c] || '').join('\t'))].join('\n') + '\n';
}

export function memoryStore() {
  const data = new Map();
  return {
    data,
    async get(key, opts = {}) {
      if (!data.has(key)) return null;
      return opts.type === 'json' ? JSON.parse(data.get(key)) : data.get(key);
    },
    async set(key, value) { data.set(key, String(value)); },
    async setJSON(key, value) { data.set(key, JSON.stringify(value)); },
  };
}

const json = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

// Fake network for one run. Records every request it answers.
export function fakeNetwork({ sample, run, calls, sent, prompts }) {
  const used = { search: false };
  const byRole = {};
  const nextCanned = (postId, role) => {
    const key = `${postId}:${role}`;
    byRole[key] = (byRole[key] || 0) + 1;
    const list = sample.canned[postId]?.[role] || [];
    return list[byRole[key] - 1] ?? (role === 'judge' ? '{"hard_checks_pass":false,"failed":["no canned answer"],"scores":{},"verdict":"REDO","fix":""}' : '');
  };
  return async (url, init = {}) => {
    const u = new URL(url);
    calls.push(`${init.method || 'GET'} ${u.origin}${u.pathname}`);
    if (u.origin === 'https://api.x.com' && u.pathname === '/2/tweets/search/recent') {
      const data = used.search ? [] : (run.search || []);
      used.search = true;
      return json({ data, meta: { result_count: data.length, newest_id: data.map((p) => p.id).sort().pop() } });
    }
    if (u.origin === 'https://api.x.com' && u.pathname === '/2/tweets') {
      const ids = new Set(u.searchParams.get('ids').split(','));
      return json({ data: [...(run.lookup || []), ...(run.search || [])].filter((p) => ids.has(p.id)) });
    }
    if (u.origin === 'https://api.x.com' && u.pathname === '/2/users') {
      const ids = u.searchParams.get('ids').split(',');
      return json({ data: ids.filter((id) => sample.users[id]).map((id) => ({ id, username: sample.users[id] })) });
    }
    if (u.origin === 'https://api.anthropic.com' && u.pathname === '/v1/messages') {
      const body = JSON.parse(init.body);
      const user = body.messages[0].content;
      const postId = (user.match(/POST ID: (\d+)/) || [])[1];
      const role = body.system === DRAFT_SYSTEM ? 'draft' : 'judge';
      prompts.push({ role, model: body.model, postId, system: body.system, user });
      const text = nextCanned(postId, role);
      return json({ model: body.model, content: [{ type: 'text', text }], usage: { input_tokens: Math.round((body.system.length + user.length) / 4), output_tokens: Math.round(text.length / 4) } });
    }
    if (u.origin === 'https://ntfy.sh') {
      sent.push(JSON.parse(init.body));
      return json({ id: 'dry-run', event: 'message' });
    }
    throw new Error(`dry run blocked a network call to ${u.origin}`);
  };
}

export async function dryRun({ sample = JSON.parse(read('scripts/fixtures/viral-watch-sample.json')), settings = read('src/data/viral-watch.json'), env = {} } = {}) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('dry run: real network is not allowed'); };
  const store = memoryStore();
  const files = { calendar: () => sampleCalendarTsv(sample.calendar_rows), settings: () => settings };
  const fullEnv = readEnv({
    X_BEARER_TOKEN: 'dry-run-fake-x-token', ANTHROPIC_API_KEY: 'dry-run-fake-key', NTFY_TOPIC: 'dry-run-fake-topic', ...env,
  });
  const results = []; const sent = []; const calls = []; const prompts = [];
  try {
    for (const run of sample.runs) {
      const logs = [];
      const result = await runViralWatch({
        env: fullEnv, now: new Date(run.at), fetchImpl: fakeNetwork({ sample, run, calls, sent, prompts }),
        store, files, log: (m) => logs.push(m),
      });
      results.push({ at: run.at, note: run.note, result, logs });
    }
  } finally {
    globalThis.fetch = realFetch;
  }
  const logKeys = [...store.data.keys()].filter((k) => k.startsWith('viral-log/'));
  return { results, sent, calls, prompts, state: JSON.parse(store.data.get('state') || 'null'), log: logKeys.map((k) => ({ key: k, lines: store.data.get(k).trim().split('\n').map((l) => JSON.parse(l)) })) };
}

function printWalkthrough(out) {
  const p = (s = '') => console.log(s);
  p('VIRAL WATCH DRY RUN — sample data, fake network, nothing sent');
  p('='.repeat(64));
  for (const r of out.results) {
    p(`\n${r.at} — ${r.note}`);
    for (const line of r.result.lines || []) {
      if (line.type === 'run') {
        p(`  run: ${line.watched} cases watched, ${line.queries} search, ${line.new_post_reads} new post reads, ${line.tracked} tracked, ${line.candidates} candidates, ${line.councils} councils, ${line.alerts} alerts`);
        continue;
      }
      const who = line.username ? `@${line.username}` : line.author_id;
      p(`  ${line.type === 'alert' ? 'ALERT' : 'near miss'}: post ${line.post_id} by ${who} · ${line.level || '-'} · ${line.reason || ''}`);
      for (const [i, a] of (line.council?.attempts || []).entries()) {
        p(`    draft ${i + 1}: ${a.draft}`);
        if (a.code_failed.length) p(`      code checks FAILED: ${a.code_failed.join('; ')}`);
        if (a.verdict) p(`      judge: ${a.verdict.pass ? 'PASS' : 'REDO'} · weighted ${a.verdict.weighted.toFixed(2)} · scores ${JSON.stringify(a.judge.scores)}${a.judge.fix ? ` · fix: ${a.judge.fix}` : ''}`);
      }
    }
  }
  p('\nPHONE ALERTS (caught by the fake ntfy; NOT sent)');
  p('-'.repeat(64));
  for (const a of out.sent) {
    p(`[priority ${a.priority}, tags ${a.tags.join(',')}] ${a.title}`);
    for (const l of a.message.split('\n')) p(`  ${l}`);
    for (const b of a.actions) p(`  button "${b.label}" → ${b.url}`);
    p();
  }
  const first = out.prompts.find((x) => x.role === 'draft');
  const judge = out.prompts.find((x) => x.role === 'judge');
  if (first) { p('FIRST DRAFT PROMPT (user part)'); p('-'.repeat(64)); p(first.user); p(); }
  if (judge) { p('FIRST JUDGE PROMPT (user part; the judge never sees the draft prompt)'); p('-'.repeat(64)); p(judge.user); p(); }
  p(`Network calls answered by the fake: ${out.calls.length} (${[...new Set(out.calls)].join(', ')})`);
  p(`Audit log lines written: ${out.log.reduce((n, l) => n + l.lines.length, 0)} in ${out.log.map((l) => l.key).join(', ')}`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const out = await dryRun();
  if (process.argv.includes('--json')) console.log(JSON.stringify(out, null, 2));
  else printWalkthrough(out);
}
