import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { runInNewContext } from 'node:vm';
import { initBeehiivParentSignup, isBeehiivSignupResult } from '../src/scripts/beehiiv-parent-signup.mjs';

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}

class MockFrame {
  constructor({ attrs = {}, dataset = {}, resultUrl = 'about:blank', crossOrigin = false } = {}) {
    this.attrs = attrs;
    this.dataset = { ...dataset };
    this.listeners = new Map();
    this.resultUrl = resultUrl;
    this.crossOrigin = crossOrigin;
    const frame = this;
    this.contentWindow = { location: {} };
    Object.defineProperty(this.contentWindow.location, 'href', {
      get() {
        if (frame.crossOrigin) throw new DOMException('Blocked', 'SecurityError');
        return frame.resultUrl;
      },
    });
  }
  addEventListener(name, handler) { this.listeners.set(name, handler); }
  dispatchLoad() { this.listeners.get('load')?.(); }
  getAttribute(name) { return this.attrs[name] ?? null; }
}

function harness({ frames = [], href = 'https://cassiancreed.com/post/example/', withGtag = true, storage = new MemoryStorage() } = {}) {
  const events = [];
  const location = new URL(href);
  const listeners = new Map();
  const document = {
    selector: null,
    querySelectorAll(selector) { this.selector = selector; return frames; },
    addEventListener(name, handler) { listeners.set(name, handler); },
  };
  const window = {
    location,
    localStorage: storage,
    NEP_ORIGIN: { s: 'spotify', m: 'podcast', c: 'case_launch', u: 'episode_1', k: 'trial', p: '/start-here/' },
  };
  window.top = window;
  if (withGtag) window.gtag = (...args) => events.push(args);
  initBeehiivParentSignup({ window, document, storage, now: () => 1_000_000 });
  return { document, events, listeners, storage, window };
}

test('requires exact same-origin subscribed=1 result', () => {
  assert.equal(isBeehiivSignupResult('https://cassiancreed.com/?subscribed=1', 'https://cassiancreed.com', 'https://cassiancreed.com/'), true);
  assert.equal(isBeehiivSignupResult('https://cassiancreed.com/?not_subscribed=1', 'https://cassiancreed.com', 'https://cassiancreed.com/'), false);
  assert.equal(isBeehiivSignupResult('https://example.com/?subscribed=1', 'https://cassiancreed.com', 'https://cassiancreed.com/'), false);
  assert.equal(isBeehiivSignupResult('about:blank', 'https://cassiancreed.com', 'https://cassiancreed.com/'), false);
});

test('initial cross-origin iframe load emits nothing and does not latch', () => {
  const frame = new MockFrame({
    attrs: { src: 'https://subscribe-forms.beehiiv.com/v3/forms/form-1?utm_campaign=guide' },
    crossOrigin: true,
  });
  const { events } = harness({ frames: [frame] });
  frame.dispatchLoad();
  assert.equal(events.length, 0);
  assert.equal(frame.dataset.nepSignupFired, undefined);
});

test('tagged parent frame emits exactly one fully attributed signup', () => {
  const frame = new MockFrame({
    attrs: { src: 'https://subscribe-forms.beehiiv.com/v3/forms/form-2?utm_campaign=fallback' },
    dataset: {
      nepConversionPage: '/post/case/',
      nepCtaId: 'case_footer',
      nepFormId: 'form-2',
      nepOfferId: 'court_guide',
      nepCampaign: 'case_campaign',
    },
    resultUrl: 'https://cassiancreed.com/?subscribed=1',
  });
  const { events } = harness({ frames: [frame] });
  frame.dispatchLoad();
  frame.dispatchLoad();
  assert.equal(events.length, 1);
  assert.equal(events[0][0], 'event');
  assert.equal(events[0][1], 'sign_up');
  assert.deepEqual(events[0][2], {
    method: 'beehiiv',
    page_path: '/post/example/',
    acquisition_source: 'spotify',
    acquisition_medium: 'podcast',
    acquisition_campaign: 'case_launch',
    acquisition_content: 'episode_1',
    acquisition_term: 'trial',
    acquisition_landing_page: '/start-here/',
    conversion_page: '/post/case/',
    cta_id: 'case_footer',
    form_id: 'form-2',
    offer_id: 'court_guide',
    capture_offer: 'case_campaign',
  });
  assert.equal(frame.dataset.nepSignupFired, '1');
});

test('legacy raw embed is selected and derives form and campaign', () => {
  const frame = new MockFrame({
    attrs: { src: 'https://subscribe-forms.beehiiv.com/v3/forms/legacy-uuid?utm_campaign=legacy_case' },
    resultUrl: 'https://cassiancreed.com/?subscribed=1',
  });
  const { document, events } = harness({ frames: [frame], href: 'https://cassiancreed.com/post/legacy/' });
  frame.dispatchLoad();
  assert.match(document.selector, /subscribe-forms\.beehiiv\.com\/v3\/forms/);
  assert.equal(events[0][2].conversion_page, '/post/legacy/');
  assert.equal(events[0][2].form_id, 'legacy-uuid');
  assert.equal(events[0][2].capture_offer, 'legacy_case');
  assert.equal(events[0][2].cta_id, '(unknown)');
  assert.equal(events[0][2].offer_id, '(unknown)');
});

test('only the converted frame emits', () => {
  const idle = new MockFrame({ attrs: { src: 'https://subscribe-forms.beehiiv.com/v3/forms/idle' }, resultUrl: 'about:blank' });
  const converted = new MockFrame({ attrs: { src: 'https://subscribe-forms.beehiiv.com/v3/forms/converted' }, resultUrl: 'https://cassiancreed.com/?subscribed=1' });
  const { events } = harness({ frames: [idle, converted] });
  idle.dispatchLoad();
  converted.dispatchLoad();
  assert.equal(events.length, 1);
  assert.equal(events[0][2].form_id, 'converted');
});

test('missing parent gtag does not mark a converted frame dispatched', () => {
  const frame = new MockFrame({
    attrs: { src: 'https://subscribe-forms.beehiiv.com/v3/forms/form-3' },
    resultUrl: 'https://cassiancreed.com/?subscribed=1',
  });
  harness({ frames: [frame], withGtag: false });
  frame.dispatchLoad();
  assert.equal(frame.dataset.nepSignupFired, undefined);
});

test('blocked localStorage getter does not abort iframe attribution', () => {
  const frame = new MockFrame({
    attrs: { src: 'https://subscribe-forms.beehiiv.com/v3/forms/storage-blocked' },
    resultUrl: 'https://cassiancreed.com/?subscribed=1',
  });
  const events = [];
  const document = {
    querySelectorAll: () => [frame],
    addEventListener() {},
  };
  const window = {
    location: new URL('https://cassiancreed.com/post/example/'),
    gtag: (...args) => events.push(args),
  };
  Object.defineProperty(window, 'localStorage', {
    get() { throw new DOMException('Blocked', 'SecurityError'); },
  });
  window.top = window;

  assert.doesNotThrow(() => initBeehiivParentSignup({ window, document, now: () => 1_000_000 }));
  frame.dispatchLoad();
  assert.equal(events.length, 1);
  assert.equal(events[0][2].form_id, 'storage-blocked');
});

test('product links never create fallback signup markers', () => {
  const storage = new MemoryStorage();
  const source = harness({ storage });
  const product = {
    href: 'https://cassiancreed.beehiiv.com/products/jury-chess?utm_campaign=book',
    dataset: {},
    closest: () => product,
  };
  source.listeners.get('click')({ target: product });
  assert.equal(storage.getItem('nep_signup_pending_v1'), null);

  const result = harness({ href: 'https://cassiancreed.com/?subscribed=1', storage });
  assert.equal(result.events.length, 0);
});

test('fallback marker is one-use; direct and reloaded result URLs emit zero', () => {
  const direct = harness({ href: 'https://cassiancreed.com/?subscribed=1' });
  assert.equal(direct.events.length, 0);

  const storage = new MemoryStorage();
  const source = harness({ storage });
  const link = {
    href: 'https://subscribe-forms.beehiiv.com/v3/forms/fallback-form?utm_campaign=fallback_campaign',
    dataset: { nepConversionPage: '/post/example/', nepCtaId: 'fallback_cta', nepOfferId: 'guide' },
    closest: () => link,
  };
  source.listeners.get('click')({ target: link });
  const result = harness({ href: 'https://cassiancreed.com/?subscribed=1', storage });
  assert.equal(result.events.length, 1);
  assert.equal(result.events[0][2].form_id, 'fallback-form');
  assert.equal(result.events[0][2].cta_id, 'fallback_cta');
  const reload = harness({ href: 'https://cassiancreed.com/?subscribed=1', storage });
  assert.equal(reload.events.length, 0);
});

test('malformed, nonfinite, future, and expired fallback markers emit zero', () => {
  const markers = [
    { label: 'malformed', createdAt: 'not-a-number' },
    { label: 'nonfinite', rawCreatedAt: '1e400' },
    { label: 'future', createdAt: 1_000_001 },
    { label: 'expired', createdAt: -800_001 },
  ];

  for (const marker of markers) {
    const storage = new MemoryStorage();
    const meta = JSON.stringify({
      conversion_page: '/post/example/',
      cta_id: 'fallback_cta',
      form_id: 'fallback-form',
      offer_id: 'guide',
      capture_offer: 'fallback_campaign',
    });
    const createdAt = marker.rawCreatedAt ?? JSON.stringify(marker.createdAt);
    storage.setItem('nep_signup_pending_v1', `{"created_at":${createdAt},"meta":${meta}}`);

    const result = harness({ href: 'https://cassiancreed.com/?subscribed=1', storage });
    assert.equal(result.events.length, 0, marker.label);
    assert.equal(storage.getItem('nep_signup_pending_v1'), null, marker.label);
  }
});

test('source invariant leaves one signup writer and preserves diagnostics', async () => {
  const files = await Promise.all([
    'src/scripts/beehiiv-parent-signup.mjs',
    'src/layouts/Base.astro',
    'src/pages/subscribed.astro',
    'src/components/CaptureBlock.astro',
    'src/pages/index.astro',
  ].map((path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')));
  const production = files.join('\n');
  assert.equal((production.match(/gtag\('event', 'sign_up'/g) || []).length, 1);
  assert.doesNotMatch(files[2], /sign_up/);
  assert.match(files[3], /capture_success/);
  assert.match(files[4], /capture_success/);
});


test('GA4 loader and page_view are gated to canonical top-level pages', async () => {
  const base = await readFile(new URL('../src/layouts/Base.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(base, /<script[^>]+src=["']https:\/\/www\.googletagmanager\.com\/gtag\/js/);
  assert.match(base, /var isTopLevel = window\.top === window;/);
  assert.match(base, /if \(!isTopLevel\) return;/);
  assert.match(base, /host !== 'cassiancreed\.com' && host !== 'www\.cassiancreed\.com'/);
  assert.match(base, /document\.head\.appendChild\(loader\)/);
  assert.match(base, /gtag\('config', 'G-5D0DX6WFW4', \{ send_page_view: isTopLevel \}\)/);

  const inline = base.match(/<!-- Google Analytics 4[\s\S]*?<script is:inline>\s*([\s\S]*?)\s*<\/script>/)?.[1];
  assert.ok(inline, 'GA4 inline loader script not found');
  const execute = ({ host, isTopLevel }) => {
    const appended = [];
    const window = {};
    window.top = isTopLevel ? window : {};
    const document = {
      createElement: () => ({}),
      head: { appendChild: (node) => appended.push(node) },
    };
    runInNewContext(inline, { Date, document, location: { hostname: host }, window });
    return { appended, dataLayer: window.dataLayer || [] };
  };

  const canonical = execute({ host: 'cassiancreed.com', isTopLevel: true });
  assert.equal(canonical.appended.length, 1);
  assert.equal(canonical.appended[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-5D0DX6WFW4');
  assert.equal(canonical.dataLayer.length, 2);
  assert.equal(canonical.dataLayer[1][0], 'config');
  assert.equal(canonical.dataLayer[1][1], 'G-5D0DX6WFW4');
  assert.deepEqual({ ...canonical.dataLayer[1][2] }, { send_page_view: true });

  const iframe = execute({ host: 'cassiancreed.com', isTopLevel: false });
  assert.equal(iframe.appended.length, 0);
  assert.equal(iframe.dataLayer.length, 0);

  const preview = execute({ host: 'deploy-preview-149--sunny-tulumba-9894fe.netlify.app', isTopLevel: true });
  assert.equal(preview.appended.length, 0);
  assert.equal(preview.dataLayer.length, 0);
});
