import { LIVE_PRODUCTS, GUIDE_PREVIEWS, PREVIEW_LINK_TEXT } from './calendar-explainer-links.mjs';
// NEP-20261019-GUIDE-BUTTONS: one source for the paid-guide button on free case
// explainers. Exact case match only (no topic pages, no roundups). Product
// names and prices come from LIVE_PRODUCTS; a post whose product is not live
// renders nothing. Each post shows the button twice:
//   'end'    — inside the article, right after the main explainer (markdown block)
//   'bottom' — after the article body, rendered by GuideCTA.astro
// Jury Chess is a book, not a case guide, and is never placed here.
export const POST_GUIDE_CTAS = {
  'jared-bridegan-case-explained': { product: 'jared-bridegan-case-guide-v2', campaign: 'explainer_bridegan_v2', key: 'bridegan' },
  'the-murdaugh-murders-how-alex-murdaugh-was-convicted-and-why-he-now-faces-a-new-trial': { product: 'murdaugh-retrial-guide', campaign: 'explainer_murdaugh_v1', key: 'murdaugh' },
  'a-jury-convicted-a-family-still-grieves-karmelo-anthony-verdict-austin-metcalf': { product: 'austin-metcalf-karmelo-anthony-case-guide', campaign: 'explainer_anthony_v1', key: 'anthony' },
  'why-was-keffe-d-convicted-tupac-shakur': { product: 'tupac-shakur-keffe-d-case-guide', campaign: 'explainer_tupac_v1', key: 'tupac' },
  'christa-pike-failed-execution-what-happens-next': { product: 'christa-pike-failed-execution-guide', campaign: 'explainer_pike_v1', key: 'pike' },
  'what-happens-at-d4vds-monday-hearing': { product: 'celeste-rivas-hernandez-d4vd-charges-guide', campaign: 'explainer_d4vd_v2', key: 'd4vd' },
  'lindsay-clancy-trial': { product: 'lindsay-clancy-post-mistrial-field-guide', campaign: 'explainer_clancy_v1', key: 'clancy_tracker' },
  'lindsay-clancy-trial-2026-postpartum-psychosis': { product: 'lindsay-clancy-post-mistrial-field-guide', campaign: 'explainer_clancy_v1', key: 'clancy_psychosis' },
  'lindsay-clancy-trial-postpartum-mental-health-legal-nexus': { product: 'lindsay-clancy-post-mistrial-field-guide', campaign: 'explainer_clancy_v1', key: 'clancy_nexus' },
  'the-lindsay-clancy-case-three-children-one-trial-and-the-questions-massachusetts-must-answer': { product: 'lindsay-clancy-post-mistrial-field-guide', campaign: 'explainer_clancy_v1', key: 'clancy_overview' },
  'kouri-richins-eric-richins-murder': { product: 'eric-richins-kouri-evidence-verdict', campaign: 'explainer_richins_v1', key: 'richins' },
  'luigi-mangione-psychiatric-defense-withdrawn-trial-2026': { product: 'brian-thompson-luigi-mangione-two-courts', campaign: 'explainer_luigi_v1', key: 'mangione' },
  'erin-patterson-case-explained': { product: 'case-chess-erin-patterson', campaign: 'explainer_patterson_v1', key: 'patterson' },
  'michelle-parker-case-dale-smith-charged-no-body': { product: 'both-sides-michelle-parker-guide-v3', campaign: 'explainer_parker_bothsides_v3', key: 'parker' },
};

export const POST_GUIDE_PLACEMENTS = ['end', 'bottom'];

export function postGuideCta(slug, placement) {
  const config = POST_GUIDE_CTAS[slug];
  if (!config || !POST_GUIDE_PLACEMENTS.includes(placement)) return null;
  const product = LIVE_PRODUCTS[config.product];
  if (!product || !/^\$\d+\.\d{2}$/.test(product.price || '')) return null;
  const ctaPlacement = `${config.key}_free_post_${placement}`;
  const params = new URLSearchParams({
    utm_source: 'cassiancreed.com',
    utm_medium: 'post_cta',
    utm_campaign: config.campaign,
    utm_content: ctaPlacement,
  });
  const previewUrl = GUIDE_PREVIEWS[config.product];
  return {
    href: `${product.url}?${params}`,
    bookKey: config.product,
    placement: ctaPlacement,
    price: product.price,
    badge: `${product.price} GUIDE`,
    label: `Get the ${product.price} guide: ${product.title} →`,
    preview: previewUrl ? { href: previewUrl, text: PREVIEW_LINK_TEXT, placement: `${ctaPlacement}_preview` } : null,
  };
}

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Exact markup for the in-article ('end') block. Markdown posts cannot import a
// component, so each post carries this HTML verbatim; the posts check keeps the
// two in sync, and GuideCTA.astro renders the same structure at the bottom.
export function postGuideCtaHtml(slug, placement = 'end') {
  const cta = postGuideCta(slug, placement);
  if (!cta) return '';
  const lines = [
    '<div class="guide-offer">',
    `<a class="guide-btn" data-link-type="paid" href="${escapeHtml(cta.href)}" target="_blank" rel="noopener noreferrer" data-book-key="${cta.bookKey}" data-cta-placement="${cta.placement}"><span class="calendar-badge" data-link-type="paid" aria-hidden="true">${cta.badge}</span><span>${escapeHtml(cta.label)}</span></a>`,
  ];
  if (cta.preview) {
    lines.push(`<a class="calendar-resource" data-link-type="free" href="${cta.preview.href}" target="_blank" rel="noopener" data-preview-for="${cta.bookKey}" data-cta-placement="${cta.preview.placement}"><span class="calendar-badge" data-link-type="free">FREE</span><span>${cta.preview.text} →</span></a>`);
  }
  lines.push('</div>');
  return lines.join('\n');
}
