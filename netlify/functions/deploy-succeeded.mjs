// IndexNow ping after every successful production deploy.
// Netlify runs a function named "deploy-succeeded" automatically when a deploy
// finishes. It tells Bing (which feeds ChatGPT search and Copilot), Yandex,
// Seznam and Naver which pages changed, so fresh court-calendar and
// missing-persons data is found in minutes instead of days. Google does not use
// IndexNow; it reads the sitemap.
// The key file lives at /e2f13eb5972b0f6f86240329f19fb884.txt. Rollback: delete this file and the key file.
const HOST = 'cassiancreed.com';
const KEY = 'e2f13eb5972b0f6f86240329f19fb884';
const ALWAYS = [
  '/', '/court-calendar/', '/missing-persons/', '/today/', '/trending/',
  '/the-names-genetic-genealogy-gave-back/', '/true-crime-watch-calendar/', '/genealogy/',
];
const RECENT_DAYS = 2;
const MAX_URLS = 500;

export function pickUrls(sitemapXml, now = new Date()) {
  const cutoff = new Date(now.getTime() - RECENT_DAYS * 86400000).toISOString().slice(0, 10);
  const urls = new Set(ALWAYS.map((p) => 'https://' + HOST + p));
  const re = /<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?<\/url>/g;
  let m;
  while ((m = re.exec(sitemapXml)) && urls.size < MAX_URLS) {
    const [, loc, lastmod] = m;
    if (lastmod && lastmod.slice(0, 10) >= cutoff && loc.startsWith('https://' + HOST + '/')) urls.add(loc);
  }
  return [...urls].slice(0, MAX_URLS);
}

export async function handler(event) {
  let context = 'unknown';
  try { context = JSON.parse(event.body || '{}')?.payload?.context || 'unknown'; } catch {}
  if (context !== 'production') {
    console.log('indexnow: skipped, deploy context = ' + context);
    return { statusCode: 200, body: 'skipped' };
  }
  try {
    const res = await fetch('https://' + HOST + '/sitemap.xml?v=' + Date.now());
    const urlList = pickUrls(await res.text());
    const ping = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: 'https://' + HOST + '/' + KEY + '.txt', urlList }),
    });
    console.log('indexnow: sent ' + urlList.length + ' urls, status ' + ping.status);
    return { statusCode: 200, body: 'indexnow ' + ping.status + ' ' + urlList.length };
  } catch (err) {
    console.log('indexnow: failed ' + (err && err.message));
    return { statusCode: 200, body: 'indexnow failed' };
  }
}
