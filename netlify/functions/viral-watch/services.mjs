// Viral Watch (Route A) — network calls (X API v2 and ntfy). Every function
// takes fetchImpl so tests and the dry run can swap in a fake.
export const X_BASE = 'https://api.x.com/2';
export const TWEET_FIELDS = 'created_at,public_metrics,author_id,possibly_sensitive';
export const USER_FIELDS = 'public_metrics,username';

// note_tweet carries the whole text of a long post. If X ever rejects the field,
// the run drops it (flag note_tweet_unsupported) and skips posts that may be cut off.
export const tweetFields = (flags = {}) => (flags.note_tweet_unsupported ? TWEET_FIELDS : `${TWEET_FIELDS},note_tweet`);

export class XError extends Error {
  constructor(status, body) {
    const detail = body?.detail || body?.title || body?.errors?.map((e) => e.message).join('; ') || 'request failed';
    super(`x ${status}: ${detail}`);
    this.status = status;
    this.body = body;
  }
}

async function xGet(path, params, { token, fetchImpl = fetch, timeoutMs = 6000 }) {
  const url = new URL(X_BASE + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  const res = await fetchImpl(url.toString(), { headers: { authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(timeoutMs) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new XError(res.status, body);
  return body;
}

// X wants second precision: YYYY-MM-DDTHH:mm:ssZ.
export const xTime = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

export function searchRecent(opts, { query, maxResults, sinceId, startTime, expandAuthors, fields = tweetFields() }) {
  return xGet('/tweets/search/recent', {
    query,
    max_results: Math.min(100, Math.max(10, maxResults || 10)),
    since_id: sinceId || undefined,
    start_time: sinceId ? undefined : startTime,
    'tweet.fields': fields,
    expansions: expandAuthors ? 'author_id' : undefined,
    'user.fields': expandAuthors ? USER_FIELDS : undefined,
  }, opts);
}

export function lookupPosts(opts, ids, fields = tweetFields()) {
  return xGet('/tweets', { ids: ids.slice(0, 100).join(','), 'tweet.fields': fields }, opts);
}

// A 400 that names note_tweet means this API version will not send the field.
export const rejectsNoteTweet = (err) => err instanceof XError && err.status === 400
  && /note_tweet/i.test(JSON.stringify(err.body || {}) + err.message);

export function lookupUsers(opts, ids) {
  return xGet('/users', { ids: ids.slice(0, 100).join(','), 'user.fields': USER_FIELDS }, opts);
}

// A 400 that names an engagement operator means this API tier rejects it.
export const rejectsMinLikes = (err) => err instanceof XError && err.status === 400
  && /min_likes|operator/i.test(JSON.stringify(err.body || {}) + err.message);

export async function sendNtfy({ fetchImpl = fetch, payload, token, server = 'https://ntfy.sh/' }) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetchImpl(server, { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`ntfy ${res.status}`);
  return res.status;
}
