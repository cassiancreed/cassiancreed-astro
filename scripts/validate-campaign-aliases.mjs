const productPath = 'https://cassiancreed.beehiiv.com/products/lindsay-clancy-trial-book';
const expected = new Map([
  ['/clancy-a', 'clancy_a'],
  ['/clancy-b', 'clancy_b'],
  ['/clancy-c', 'clancy_c'],
]);
const failures = [];
const { default: redirect, config } = await import('../netlify/functions/clancy-alias.mjs');
const blockedPiiShapes = ['123-45-6789', '1980-01-01', 'John_Doe', '1555-123-4567'];

const configuredPaths = new Set(config?.path ?? []);

for (const [source, content] of expected) {
  for (const path of [source, `${source}/`]) {
    if (!configuredPaths.has(path)) failures.push(`${path}: missing from function path config`);
  }

  const cases = [
    { suffix: '', extras: [] },
    {
      suffix: '?ref=weekend&creative=short-1&ref=repeat',
      extras: [['ref', 'weekend'], ['ref', 'repeat'], ['creative', 'short-1']],
    },
    {
      suffix: '?utm_source=spoof&utm_medium=spoof&utm_campaign=spoof&utm_content=spoof&utm_term=spoof&utm_id=spoof&ref=collision',
      extras: [['ref', 'collision']],
    },
    {
      suffix: '?email=user%40example.com&phone=15551234567&note=%2Fprivate-path&ssn=123-45-6789&dob=1980-01-01&fullname=John_Doe&postal_code=98082&ref=privacy-safe',
      extras: [['ref', 'privacy-safe']],
      absent: ['email', 'phone', 'note', 'ssn', 'dob', 'fullname', 'postal_code'],
    },
    {
      suffix: '?ref=sale-2026&creative=creator_42&ttclid=abc_123',
      extras: [['ref', 'sale-2026'], ['creative', 'creator_42'], ['ttclid', 'abc_123']],
    },
    ...blockedPiiShapes.flatMap((value) => [
      { suffix: `?ref=${encodeURIComponent(value)}`, extras: [], absent: ['ref'] },
      { suffix: `?creative=${encodeURIComponent(value)}`, extras: [], absent: ['creative'] },
    ]),
  ];

  for (const { suffix, extras, absent = [] } of cases) {
    const response = await redirect(new Request(`https://deploy-preview.example${source}${suffix}`));
    if (response.status !== 302) failures.push(`${source}${suffix}: expected HTTP 302, found ${response.status}`);

    const location = response.headers.get('location');
    if (!location) {
      failures.push(`${source}${suffix}: missing Location header`);
      continue;
    }

    const url = new URL(location);
    if (`${url.origin}${url.pathname}` !== productPath) {
      failures.push(`${source}${suffix}: target must use the canonical Clancy product URL`);
    }

    const expectedParameters = {
      utm_source: 'tiktok',
      utm_medium: 'social',
      utm_campaign: 'lindsay_clancy_trial_book',
      utm_content: content,
    };
    for (const [key, value] of Object.entries(expectedParameters)) {
      if (url.searchParams.getAll(key).length !== 1 || url.searchParams.get(key) !== value) {
        failures.push(`${source}${suffix}: ${key} must equal ${value} exactly once`);
      }
    }
    const expectedExtras = new Map();
    for (const [key, value] of extras) {
      const values = expectedExtras.get(key) ?? [];
      values.push(value);
      expectedExtras.set(key, values);
    }
    for (const [key, values] of expectedExtras) {
      if (JSON.stringify(url.searchParams.getAll(key)) !== JSON.stringify(values)) {
        failures.push(`${source}${suffix}: additional parameter ${key} was not preserved exactly`);
      }
    }
    for (const key of absent) {
      if (url.searchParams.has(key)) failures.push(`${source}${suffix}: unsafe parameter ${key} must be discarded`);
    }
  }

  const headResponse = await redirect(new Request(`https://deploy-preview.example${source}?probe=head`, { method: 'HEAD' }));
  if (headResponse.status !== 302 || !headResponse.headers.get('location')?.includes(`utm_content=${content}`)) {
    failures.push(`${source}: HEAD must return the arm's HTTP 302 redirect`);
  }
}

if (configuredPaths.size !== expected.size * 2) {
  failures.push(`expected ${expected.size * 2} configured paths, found ${configuredPaths.size}`);
}

const postResponse = await redirect(new Request('https://deploy-preview.example/clancy-a', { method: 'POST' }));
if (postResponse.status !== 405 || postResponse.headers.get('allow') !== 'GET, HEAD') {
  failures.push('non-navigation methods must fail closed with HTTP 405 and an Allow header');
}

const unknownResponse = await redirect(new Request('https://deploy-preview.example/clancy-z'));
if (unknownResponse.status !== 404) failures.push('unknown aliases must return HTTP 404');

if (failures.length) {
  console.error(`Campaign aliases invalid:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

console.log('Campaign aliases valid: 3 GET/HEAD routes return temporary nonloop product redirects, preserve additional query parameters, and protect exact arm attribution.');
