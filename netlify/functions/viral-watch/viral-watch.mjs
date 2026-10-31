// Viral Watch (Route A) — Netlify Scheduled Function, every 10 minutes.
// Finds X posts about NEP's watched cases that are about to go viral, has
// Claude draft a reply (or our own post) and a separate Claude model judge it,
// and sends ONE ntfy phone alert with a prefilled X link. It never posts to X.
//
// Off switches: unset ANTHROPIC_API_KEY (or any required secret), or set
// VIRAL_DISABLED=1. Test switch: VIRAL_DRY_RUN=1 runs everything but sends
// nothing. Settings: src/data/viral-watch.json. Audit: Netlify Blobs store
// "viral-watch", keys "state" and "viral-log/YYYY-MM-DD" (Pacific date).
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStore } from '@netlify/blobs';
import { parseCourtCalendar } from '../../../src/data/court-calendar-parser.mjs';
import { calendarLinksFor } from '../../../src/data/calendar-explainer-links.mjs';
import * as core from './core.mjs';
import { anthropicCaller, runCouncil } from './council.mjs';
import * as x from './services.mjs';

export const config = { schedule: '*/10 * * * *' };

export const STORE_NAME = 'viral-watch';
export const DATA_FILES = { calendar: 'src/data/court-calendar.tsv', settings: 'src/data/viral-watch.json' };

const positiveInt = (v, fallback) => (/^\d+$/.test(String(v || '')) && Number(v) > 0 ? Number(v) : fallback);

export function readEnv(e = {}) {
  return {
    xToken: e.X_BEARER_TOKEN || '',
    anthropicKey: e.ANTHROPIC_API_KEY || '',
    ntfyTopic: e.NTFY_TOPIC || '',
    ntfyToken: e.NTFY_TOKEN || '',
    dailyCap: positiveInt(e.VIRAL_DAILY_CAP, 6),
    modelDraft: e.VIRAL_MODEL_DRAFT || 'claude-sonnet-5-5',
    modelJudge: e.VIRAL_MODEL_JUDGE || 'claude-opus-5-5',
    maxUntil: e.VIRAL_MAX_UNTIL || '',
    disabled: ['1', 'true', 'yes'].includes(String(e.VIRAL_DISABLED || '').toLowerCase()),
    dryRun: ['1', 'true', 'yes'].includes(String(e.VIRAL_DRY_RUN || '').toLowerCase()),
  };
}

// The data files ride in the function bundle (netlify.toml included_files).
// Where they land depends on the bundler, so try each known layout.
export function readDataFile(rel) {
  const candidates = [];
  try { candidates.push(fileURLToPath(new URL(`../../../${rel}`, import.meta.url))); } catch { /* bundled without import.meta.url */ }
  candidates.push(path.resolve(process.cwd(), rel));
  if (process.env.LAMBDA_TASK_ROOT) candidates.push(path.resolve(process.env.LAMBDA_TASK_ROOT, rel));
  for (const file of candidates) {
    try { return readFileSync(file, 'utf8'); } catch { /* try the next layout */ }
  }
  throw new Error(`${rel} not found in the function bundle (tried ${candidates.join(', ')})`);
}

const withUtm = (url) => {
  const u = new URL(url);
  u.searchParams.set('utm_source', 'x');
  u.searchParams.set('utm_medium', 'social');
  u.searchParams.set('utm_campaign', 'viral_watch');
  return u.toString();
};

const summarizeCouncil = (c) => ({
  result: c.send ? 'PASS' : 'NO SEND',
  reason: c.reason,
  attempts: c.attempts.map((a) => ({ draft: a.draft, code_failed: a.code?.failed || [], judge: a.judge, verdict: a.verdict })),
  usage: c.usage,
});

export async function runViralWatch({ env, now = new Date(), fetchImpl = fetch, store, files, log = console.log, clock = Date.now, callModel }) {
  const t0 = clock();
  if (env.disabled) { log('viral-watch: VIRAL_DISABLED is set — off'); return { status: 'disabled' }; }
  const missing = [['X_BEARER_TOKEN', env.xToken], ['ANTHROPIC_API_KEY', env.anthropicKey], ['NTFY_TOPIC', env.ntfyTopic]]
    .filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) { log(`viral-watch: missing ${missing.join(', ')} — safe no-op`); return { status: 'missing-secrets', missing }; }

  let cfg; let calendar;
  try {
    cfg = JSON.parse(files.settings());
    calendar = parseCourtCalendar(files.calendar());
  } catch (err) {
    log(`viral-watch: cannot load data files — ${err.message}`);
    return { status: 'no-data', error: err.message };
  }

  const win = core.activeWindow(now, cfg.active_hours, env.maxUntil);
  if (!win.active) { log(`viral-watch: ${win.reason} — nothing to do`); return { status: 'inactive', reason: win.reason }; }

  const blobs = typeof store === 'function' ? store() : store;
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const timeLeft = () => t0 + cfg.limits.run_budget_ms - clock();
  const laDay = core.zonedParts(now, cfg.active_hours.timezone).date;
  const state = core.rollState(await blobs.get('state', { type: 'json' }), { laDay, utc: core.utcDay(now), nowMs, cfg });
  const xo = { token: env.xToken, fetchImpl, timeoutMs: cfg.x.timeout_ms };
  // Re-test min_likes once a week in case X turns it (back) on for our tier.
  if (state.flags.min_likes_unsupported && nowMs - Date.parse(state.flags.min_likes_unsupported) > 7 * 24 * core.HOUR) delete state.flags.min_likes_unsupported;
  const lines = [];
  const run = { type: 'run', time: nowIso, window: win.reason, watched: 0, queries: 0, posts_returned: 0, new_post_reads: 0, new_user_reads: 0, tracked: 0, candidates: 0, councils: 0, alerts: 0, errors: [] };

  // 1. Watch list from the court calendar (cases with an NEP page only).
  const watch = core.buildWatchList(calendar, { today: laDay, cfg, linksFor: calendarLinksFor });
  const watched = watch.filter((c) => c.page);
  run.watched = watched.length;
  const adultTokens = core.adultTokensFor(watch);

  // Reads are billed once per post (and per user) per UTC day; count unique ids.
  const postSeen = new Set(state.budget.posts); const userSeen = new Set(state.budget.users);
  const notePosts = (ids) => { for (const id of ids) if (!postSeen.has(id)) { postSeen.add(id); run.new_post_reads += 1; } };
  const noteUsers = (ids) => { for (const id of ids) if (!userSeen.has(id)) { userSeen.add(id); run.new_user_reads += 1; } };
  let xBlocked = false;
  const xFail = (where, err) => {
    run.errors.push(`${where}: ${err.message}`);
    if ([401, 403, 429].includes(err.status)) xBlocked = true;
  };

  // 2. Search.
  const found = new Map(); const users = new Map();
  if (!watched.length) {
    run.errors.push('no watched case has an NEP page this week; search skipped');
  } else if (postSeen.size >= cfg.x.daily_post_read_cap) {
    run.errors.push(`daily post read cap (${cfg.x.daily_post_read_cap}) reached; search skipped`);
  } else {
    const expand = cfg.x.expand_authors === 'always';
    const startTime = x.xTime(nowMs - cfg.x.discovery_window_min * core.MINUTE);
    const search = (query) => {
      const since = state.since[query.key];
      const useSince = !query.threshold && since?.id && nowMs - Date.parse(since.at) < cfg.x.discovery_window_min * core.MINUTE;
      return x.searchRecent(xo, { query: query.q, maxResults: cfg.x.max_results, sinceId: useSince ? since.id : undefined, startTime, expandAuthors: expand });
    };
    const take = (query, body) => {
      run.queries += 1;
      const data = body.data || [];
      run.posts_returned += data.length;
      for (const post of data) if (!found.has(post.id)) found.set(post.id, { post, kind: query.kind });
      for (const u of body.includes?.users || []) users.set(u.id, u);
      if (body.meta?.newest_id) state.since[query.key] = { id: body.meta.newest_id, at: nowIso, q: query.q.slice(0, 120) };
    };
    let queries = core.buildQueries(watched, cfg, state.flags);
    let settled = await Promise.allSettled(queries.map(search));
    if (settled.some((r, i) => r.status === 'rejected' && queries[i].threshold && x.rejectsMinLikes(r.reason))) {
      state.flags.min_likes_unsupported = nowIso;
      log('viral-watch: X rejected min_likes — dropping it and filtering likes in code from now on');
      const keep = settled.map((r, i) => ({ r, q: queries[i] })).filter(({ r, q }) => !(r.status === 'rejected' && q.threshold));
      const retry = core.buildQueries(watched, cfg, state.flags).filter((q) => q.kind === 'case');
      const again = await Promise.allSettled(retry.map(search));
      queries = [...keep.map((k) => k.q), ...retry];
      settled = [...keep.map((k) => k.r), ...again];
    }
    settled.forEach((r, i) => (r.status === 'fulfilled' ? take(queries[i], r.value) : xFail(`search ${queries[i].kind}`, r.reason)));
    notePosts(found.keys());
    if (expand) noteUsers(users.keys());
  }

  // 3. New posts: gates first, then track. Known posts: add a check.
  const minLikesInCode = Boolean(state.flags.min_likes_unsupported);
  for (const [id, { post, kind }] of found) {
    const m = core.metricsOf(post.public_metrics);
    const known = state.tracked[id];
    if (known) {
      known.text = String(post.text || '').slice(0, 600);
      known.sensitive = Boolean(post.possibly_sensitive);
      known.checks = [...known.checks, { t: nowMs, m }].slice(-3);
      continue;
    }
    if (state.skipped[id]) continue;
    const ageMin = (nowMs - Date.parse(post.created_at)) / core.MINUTE;
    if (!(ageMin <= cfg.score.warm.max_age_min)) continue;
    // Match against every watched case so a case without an NEP page logs as no_page.
    const match = core.matchCase(post.text, watch);
    const skip = core.postSkipReason(post, match, cfg, adultTokens);
    if (skip) {
      state.skipped[id] = nowMs;
      if (core.meetsSize(m, cfg.score.hot)) {
        lines.push({ type: 'near_miss', time: nowIso, post_id: id, author_id: post.author_id, case: match?.name || null, level: null, age_min: Math.round(ageMin), metrics_now: m, sent: false, reason: `skip: ${skip}` });
      }
      continue;
    }
    if (kind === 'case' && minLikesInCode && m.likes < cfg.x.min_likes && ageMin > cfg.score.hot.max_age_min) continue;
    state.tracked[id] = {
      id, case_key: match.key, author_id: post.author_id, username: users.get(post.author_id)?.username || null,
      created_at: post.created_at, text: String(post.text || '').slice(0, 600), sensitive: Boolean(post.possibly_sensitive),
      checks: [{ t: nowMs, m }], tried: [], logged: [], alerted: false,
    };
  }
  state.tracked = core.pruneTracked(state.tracked, cfg.x.max_tracked);

  // 4. Refresh tracked posts the search did not return (one lookup call).
  const capReached = postSeen.size >= cfg.x.daily_post_read_cap;
  const stale = Object.values(state.tracked)
    .filter((p) => !p.alerted && p.checks[p.checks.length - 1].t !== nowMs)
    .filter((p) => !capReached || postSeen.has(p.id));
  if (stale.length && !xBlocked) {
    try {
      const body = await x.lookupPosts(xo, stale.map((p) => p.id));
      const back = new Map((body.data || []).map((p) => [p.id, p]));
      notePosts(back.keys());
      for (const p of stale) {
        const fresh = back.get(p.id);
        if (!fresh) { delete state.tracked[p.id]; continue; }
        p.text = String(fresh.text || p.text).slice(0, 600);
        p.sensitive = Boolean(fresh.possibly_sensitive);
        p.checks = [...p.checks, { t: nowMs, m: core.metricsOf(fresh.public_metrics) }].slice(-3);
      }
    } catch (err) { xFail('lookup', err); }
  }

  // 5. Score.
  const candidates = [];
  for (const p of Object.values(state.tracked)) {
    if (p.alerted || p.checks.length < 2) continue;
    const cur = p.checks[p.checks.length - 1];
    if (cur.t !== nowMs) continue;
    const prev = p.checks[p.checks.length - 2];
    const cls = core.classify({ createdAt: p.created_at, prev: prev.m, cur: cur.m, nowMs, cfg });
    if (!cls.level || p.tried.includes(cls.level)) continue;
    const watchCase = watched.find((c) => c.key === p.case_key);
    if (!watchCase) continue;
    candidates.push({ p, cls, watchCase, prev: prev.m });
  }
  const rank = (c) => (c.cls.level === 'HOT' ? 1e12 : 0) + (c.cls.metrics.imp + c.cls.metrics.eng * 40) * (1 + c.cls.growth / 100);
  candidates.sort((a, b) => rank(b) - rank(a));
  run.candidates = candidates.length;

  // 6. Mini council + alert.
  const caller = callModel || anthropicCaller({ apiKey: env.anthropicKey, fetchImpl });
  let alertsThisRun = 0; let councilsThisRun = 0;
  for (const { p, cls, watchCase, prev } of candidates) {
    const base = {
      time: nowIso, post_id: p.id, author_id: p.author_id, username: p.username, case: watchCase.name, case_key: watchCase.key,
      level: cls.level, age_min: Math.round(cls.ageMin), growth_pct: cls.growth, metrics_prev: prev, metrics_now: cls.metrics, page: watchCase.page.url,
    };
    const lateSkip = core.postSkipReason({ text: p.text, possibly_sensitive: p.sensitive }, watchCase, cfg, adultTokens);
    const blocked = (lateSkip && `skip: ${lateSkip}`)
      || (state.daily.alerts >= env.dailyCap && `daily alert cap (${env.dailyCap})`)
      || (state.cooldowns[watchCase.key] && `case cooldown (1 alert per case per ${cfg.limits.case_cooldown_hours} h)`)
      || (cls.level === 'HOT' && (state.daily.perAccount[p.author_id] || 0) >= cfg.limits.max_replies_per_account_per_day && `account reply cap (${cfg.limits.max_replies_per_account_per_day} per day)`)
      || (alertsThisRun >= cfg.limits.max_alerts_per_run && 'one alert per run; retry next run')
      || (councilsThisRun >= cfg.limits.max_councils_per_run && 'council limit per run; retry next run')
      || (state.daily.councils >= cfg.limits.max_councils_per_day && `council limit per day (${cfg.limits.max_councils_per_day})`)
      || (timeLeft() < 12000 && 'time budget; retry next run');
    if (blocked) {
      const tag = `${cls.level}:${blocked.split(' ')[0]}`;
      if (!p.logged.includes(tag)) { p.logged.push(tag); lines.push({ ...base, type: 'near_miss', sent: false, reason: blocked }); }
      continue;
    }
    if (!p.username && cfg.x.expand_authors !== 'always' && userSeen.size < cfg.x.daily_user_read_cap && !xBlocked) {
      try {
        const ub = await x.lookupUsers(xo, [p.author_id]);
        const u = ub.data?.[0];
        if (u) { p.username = u.username; base.username = u.username; noteUsers([u.id]); }
      } catch (err) { xFail('user lookup', err); }
    }
    if (p.username && (cfg.own_handles || []).some((h) => h.toLowerCase() === p.username.toLowerCase())) {
      p.tried.push(cls.level);
      lines.push({ ...base, type: 'near_miss', sent: false, reason: 'our own post' });
      continue;
    }
    councilsThisRun += 1; state.daily.councils += 1; p.tried.push(cls.level);
    const council = await runCouncil({
      callModel: caller, models: { draft: env.modelDraft, judge: env.modelJudge }, cfg, level: cls.level,
      post: { id: p.id, text: p.text, created_at: p.created_at }, username: p.username, watchCase, adultTokens, timeLeft,
    });
    const entry = { ...base, council: summarizeCouncil(council) };
    if (!council.send) { lines.push({ ...entry, type: 'near_miss', sent: false, reason: council.reason }); continue; }
    const payload = core.buildAlert({
      topic: env.ntfyTopic, level: cls.level, caseName: watchCase.name, username: p.username, ageMin: cls.ageMin,
      metrics: cls.metrics, growth: cls.growth, text: council.draft, weighted: council.weighted,
      checksPassed: council.checksPassed, postId: p.id, pageUrl: withUtm(watchCase.page.url),
    });
    const shown = { title: payload.title, message: payload.message, actions: payload.actions };
    if (env.dryRun) {
      log(`viral-watch: VIRAL_DRY_RUN — would alert: ${payload.title}`);
      lines.push({ ...entry, type: 'alert', sent: false, reason: 'VIRAL_DRY_RUN', alert: shown });
      continue;
    }
    try {
      await x.sendNtfy({ fetchImpl, payload, token: env.ntfyToken });
    } catch (err) {
      lines.push({ ...entry, type: 'near_miss', sent: false, reason: `ntfy failed: ${err.message}`, alert: shown });
      continue;
    }
    p.alerted = true; alertsThisRun += 1; state.daily.alerts += 1; state.cooldowns[watchCase.key] = nowMs;
    if (cls.level === 'HOT') state.daily.perAccount[p.author_id] = (state.daily.perAccount[p.author_id] || 0) + 1;
    lines.push({ ...entry, type: 'alert', sent: true, alert: shown });
  }

  // 7. Save state and the audit log.
  state.budget.posts = [...postSeen];
  state.budget.users = [...userSeen];
  Object.assign(run, { tracked: Object.keys(state.tracked).length, councils: councilsThisRun, alerts: alertsThisRun, ms: clock() - t0 });
  lines.push(run);
  await blobs.setJSON('state', state);
  const logKey = `viral-log/${laDay}`;
  const before = (await blobs.get(logKey)) || '';
  await blobs.set(logKey, before + lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  log(`viral-watch: ${run.watched} cases, ${run.queries} searches, ${run.new_post_reads} new post reads, ${run.tracked} tracked, ${run.candidates} candidates, ${run.councils} councils, ${run.alerts} alerts${run.errors.length ? `, errors: ${run.errors.join(' | ')}` : ''}`);
  return { status: 'ok', run, lines };
}

export default async function viralWatch() {
  try {
    await runViralWatch({
      env: readEnv(process.env),
      store: () => getStore({ name: STORE_NAME, consistency: 'strong' }),
      files: { calendar: () => readDataFile(DATA_FILES.calendar), settings: () => readDataFile(DATA_FILES.settings) },
    });
  } catch (err) {
    console.log(`viral-watch: failed — ${err && err.message}`);
  }
}
