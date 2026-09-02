const FRAME_SELECTOR = 'iframe[data-nep-form-id],iframe[data-calendar-alert-form],iframe[src*="subscribe-forms.beehiiv.com/v3/forms/"]';
const PENDING_KEY = 'nep_signup_pending_v1';
const PENDING_TTL_MS = 30 * 60 * 1000;

function parseUrl(rawUrl, baseUrl) {
  try { return new URL(rawUrl || '', baseUrl); } catch { return null; }
}

export function isBeehiivSignupResult(rawUrl, siteOrigin, baseUrl) {
  const url = parseUrl(rawUrl, baseUrl);
  return Boolean(url && url.origin === siteOrigin && url.searchParams.get('subscribed') === '1');
}

export function initBeehiivParentSignup(options = {}) {
  const win = options.window || window;
  const doc = options.document || document;
  const now = options.now || (() => Date.now());
  let storage = options.storage;
  if (storage === undefined) {
    try { storage = win.localStorage; } catch { storage = null; }
  }

  function metadata(element, rawUrl) {
    const url = parseUrl(rawUrl, win.location.href);
    const formMatch = (url?.pathname || '').match(/\/v3\/forms\/([^/?#]+)/);
    return {
      conversion_page: element?.dataset.nepConversionPage || win.location.pathname,
      cta_id: element?.dataset.nepCtaId || '(unknown)',
      form_id: element?.dataset.nepFormId || formMatch?.[1] || '(unknown)',
      offer_id: element?.dataset.nepOfferId || '(unknown)',
      capture_offer: element?.dataset.nepCampaign || url?.searchParams.get('utm_campaign') || '(unknown)',
    };
  }

  function fireSignup(meta) {
    if (typeof win.gtag !== 'function') return false;
    const origin = win.NEP_ORIGIN || {};
    win.gtag('event', 'sign_up', {
      method: 'beehiiv',
      page_path: win.location.pathname,
      acquisition_source: origin.s || '(direct)',
      acquisition_medium: origin.m || '(none)',
      acquisition_campaign: origin.c || '(none)',
      acquisition_content: origin.u || '(none)',
      acquisition_term: origin.k || '(none)',
      acquisition_landing_page: origin.p || '(unknown)',
      conversion_page: meta.conversion_page || win.location.pathname,
      cta_id: meta.cta_id || '(unknown)',
      form_id: meta.form_id || '(unknown)',
      offer_id: meta.offer_id || '(unknown)',
      capture_offer: meta.capture_offer || '(unknown)',
    });
    return true;
  }

  function originalFrameUrl(frame, resultUrl) {
    return frame.getAttribute('data-form-base')
      || frame.getAttribute('data-nep-base-src')
      || frame.getAttribute('src')
      || resultUrl;
  }

  function wireFrame(frame) {
    if (frame.dataset.nepSignupWired === '1') return;
    frame.dataset.nepSignupWired = '1';
    frame.addEventListener('load', () => {
      let resultUrl = '';
      try { resultUrl = frame.contentWindow.location.href; } catch { return; }
      if (!isBeehiivSignupResult(resultUrl, win.location.origin, win.location.href)) return;
      if (frame.dataset.nepSignupFired === '1' || frame.dataset.nepSignupFired === 'pending') return;
      frame.dataset.nepSignupFired = 'pending';
      if (fireSignup(metadata(frame, originalFrameUrl(frame, resultUrl)))) {
        frame.dataset.nepSignupFired = '1';
      } else {
        delete frame.dataset.nepSignupFired;
      }
    });
  }

  doc.querySelectorAll(FRAME_SELECTOR).forEach(wireFrame);

  doc.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href]');
    if (!link) return;
    const url = parseUrl(link.href, win.location.href);
    if (!url) return;
    const isForm = url.hostname === 'subscribe-forms.beehiiv.com' && url.pathname.startsWith('/v3/forms/');
    const isSignup = url.hostname === 'cassiancreed.beehiiv.com'
      && !url.pathname.startsWith('/products/')
      && (/\/(subscribe|signup)/.test(url.pathname) || url.searchParams.has('subscribed'));
    if (!isForm && !isSignup) return;
    try {
      storage?.setItem(PENDING_KEY, JSON.stringify({ created_at: now(), meta: metadata(link, url.href) }));
    } catch {}
  });

  if (win.top === win && isBeehiivSignupResult(win.location.href, win.location.origin, win.location.href)) {
    let pending = null;
    try { pending = JSON.parse(storage?.getItem(PENDING_KEY) || 'null'); } catch {}
    const createdAt = pending?.created_at;
    const checkedAt = now();
    const age = typeof createdAt === 'number' && Number.isFinite(createdAt) && Number.isFinite(checkedAt)
      ? checkedAt - createdAt
      : Number.NaN;
    if (!pending || !pending.meta || !Number.isFinite(age) || age < 0 || age > PENDING_TTL_MS) {
      try { storage?.removeItem(PENDING_KEY); } catch {}
    } else if (fireSignup(pending.meta)) {
      try { storage?.removeItem(PENDING_KEY); } catch {}
    }
  }

  return { wireFrame };
}
