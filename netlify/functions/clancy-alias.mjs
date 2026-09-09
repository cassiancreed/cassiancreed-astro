const PRODUCT_URL = 'https://cassiancreed.beehiiv.com/products/lindsay-clancy-trial-book';
const CONTENT_BY_PATH = new Map([
  ['/clancy-a', 'clancy_a'],
  ['/clancy-b', 'clancy_b'],
  ['/clancy-c', 'clancy_c'],
]);
const SAFE_EXTRA_KEYS = new Set(['creative', 'ref', 'ttclid']);
const PII_SHAPED_VALUES = [
  /^\d{3}-\d{2}-\d{4}$/,
  /^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/,
  /^\+?\d(?:[\s().-]*\d){6,}$/,
  /^[A-Za-z]{2,}(?:_[A-Za-z]{2,})+$/,
];

function isSafeExtraParameter(key, value) {
  const normalizedKey = key.toLowerCase();
  if (!SAFE_EXTRA_KEYS.has(normalizedKey)) return false;
  if (!value || value.length > 100 || value.includes('@') || /\d{7,}/.test(value)) return false;
  if (PII_SHAPED_VALUES.some((pattern) => pattern.test(value))) return false;
  return /^[A-Za-z0-9._~-]+$/.test(value);
}

export default async function clancyAlias(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', {
      status: 405,
      headers: { allow: 'GET, HEAD' },
    });
  }

  const incoming = new URL(request.url);
  const normalizedPath = incoming.pathname.replace(/\/+$/, '') || '/';
  const content = CONTENT_BY_PATH.get(normalizedPath);

  if (!content) return new Response('Not found', { status: 404 });

  const target = new URL(PRODUCT_URL);
  target.searchParams.set('utm_source', 'tiktok');
  target.searchParams.set('utm_medium', 'social');
  target.searchParams.set('utm_campaign', 'lindsay_clancy_trial_book');
  target.searchParams.set('utm_content', content);

  for (const [key, value] of incoming.searchParams) {
    if (isSafeExtraParameter(key, value)) target.searchParams.append(key, value);
  }

  return new Response(null, {
    status: 302,
    headers: {
      location: target.toString(),
      'cache-control': 'no-store',
    },
  });
}

export const config = {
  path: [
    '/clancy-a',
    '/clancy-a/',
    '/clancy-b',
    '/clancy-b/',
    '/clancy-c',
    '/clancy-c/',
  ],
};
