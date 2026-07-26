/**
 * NEP editorial-source-link policy.
 *
 * Readers should be able to see exactly where a fact came from, and should not be
 * handed a one-click exit to somebody else's site in the middle of a case file.
 *
 * This plugin runs over rendered Markdown content only. Any anchor whose target is
 * an external site is unwrapped: the anchor element is replaced by its own children,
 * so the visible citation text survives untouched and simply stops being clickable.
 * Nothing is deleted. Publication names, document titles, dates, court names and
 * docket references all still render exactly as written.
 *
 * WHAT IS DELIBERATELY LEFT ALONE
 *   - Internal links (/post/..., /court-calendar/, #anchors, relative paths).
 *   - cassiancreed.com and its subdomains — our own property.
 *   - mailto:, tel: and any other non-http scheme.
 *   - OPERATIONAL links, listed one by one in OPERATIONAL below. These are not
 *     source citations and killing them would cost the reader something real:
 *     the store and the free-guide signup, our own show and channel, and the
 *     crisis helplines a reader may need in the middle of a hard case file.
 *     Some of these do live in Markdown body copy, so "it is outside the
 *     template" is not enough protection — they have to be named here.
 *   - Anything outside Markdown body content: site navigation, the subscriber
 *     capture block, checkout and product links, and social share buttons all live
 *     in layouts and page templates and never pass through this plugin.
 *
 * Bare URLs typed into Markdown are autolinked by GFM before this plugin runs, so
 * they arrive here as anchors and are unwrapped by the same pass. That satisfies the
 * "no raw clickable URL" rule without disabling GFM anywhere else.
 *
 * Hand-written HTML inside a Markdown file is still an unparsed string when user
 * rehype plugins run (Astro schedules rehype-raw after them), so those anchors are
 * handled separately, as text, further down.
 */

const INTERNAL_HOSTS = new Set(['cassiancreed.com', 'www.cassiancreed.com']);

// Off-site but not a citation. Every entry is a link a reader is meant to be able
// to click. Anything not on this list and not internal stops being clickable.
const OPERATIONAL = [
  /^https?:\/\/[a-z0-9-]+\.beehiiv\.com(?:[/?#]|$)/i,        // store, checkout, free-guide signup
  /^https?:\/\/open\.spotify\.com(?:[/?#]|$)/i,              // our own show
  /^https?:\/\/(?:www\.)?youtube\.com\/@CassianCreed/i,      // our own channel
  /^https?:\/\/(?:www\.)?x\.com\/CassianCreed/i,             // our own account
  /^https?:\/\/988lifeline\.org(?:[/?#]|$)/i,                // crisis
  /^https?:\/\/postpartum\.net(?:[/?#]|$)/i,                 // crisis
  /^https?:\/\/(?:www\.)?thehotline\.org(?:[/?#]|$)/i,       // crisis
  /^https?:\/\/(?:www\.)?rainn\.org(?:[/?#]|$)/i,            // crisis
  /^https?:\/\/humantraffickinghotline\.org(?:[/?#]|$)/i,    // crisis
  /^https?:\/\/(?:www\.)?stalkingawareness\.org(?:[/?#]|$)/i,// crisis
  /^https?:\/\/anad\.org(?:[/?#]|$)/i,                       // crisis
];

function isExternalHttpLink(href) {
  if (typeof href !== 'string') return false;
  const value = href.trim();
  if (!/^https?:\/\//i.test(value)) return false; // internal, relative, anchor, mailto, tel
  if (OPERATIONAL.some((re) => re.test(value))) return false;
  let host;
  try {
    host = new URL(value).hostname.toLowerCase();
  } catch {
    return false; // unparseable — leave it exactly as authored
  }
  if (INTERNAL_HOSTS.has(host)) return false;
  return !host.endsWith('.cassiancreed.com');
}

// Matches one opening <a ...> tag inside a raw HTML string, capturing its attributes.
const RAW_ANCHOR_OPEN = /<a\b([^>]*)>/gi;
const HREF_IN_ATTRS = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

/**
 * Same rule, applied to hand-written HTML in a Markdown file. The opening tag and
 * its matching </a> are dropped and the text between them is kept. Anchors cannot
 * nest in valid HTML, so pairing with the next closing tag is safe.
 */
function unwrapRawAnchors(value) {
  let out = '';
  let cursor = 0;
  RAW_ANCHOR_OPEN.lastIndex = 0;
  let match;
  while ((match = RAW_ANCHOR_OPEN.exec(value)) !== null) {
    const hrefMatch = HREF_IN_ATTRS.exec(match[1] || '');
    const href = hrefMatch ? hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? '' : '';
    if (!isExternalHttpLink(href)) continue;
    const closeIdx = value.toLowerCase().indexOf('</a>', RAW_ANCHOR_OPEN.lastIndex);
    if (closeIdx === -1) continue; // closes in a later raw node — leave it alone
    out += value.slice(cursor, match.index);
    out += value.slice(RAW_ANCHOR_OPEN.lastIndex, closeIdx);
    cursor = closeIdx + 4;
    RAW_ANCHOR_OPEN.lastIndex = cursor;
  }
  return cursor === 0 ? value : out + value.slice(cursor);
}

export default function rehypePlainExternalSources() {
  return function transformer(tree) {
    let unwrapped = 0;

    const walk = (node) => {
      if (!node || !Array.isArray(node.children)) return;

      const next = [];
      for (const child of node.children) {
        if (
          child &&
          child.type === 'element' &&
          child.tagName === 'a' &&
          isExternalHttpLink(child.properties?.href)
        ) {
          unwrapped += 1;
          // Replace the anchor with its own children — the citation text stays,
          // the clickability goes. No wrapper element, no residual attributes,
          // no href left anywhere in the rendered output.
          const inner = Array.isArray(child.children) ? child.children : [];
          for (const grandchild of inner) {
            walk(grandchild);
            next.push(grandchild);
          }
          continue;
        }
        if (child && child.type === 'raw' && typeof child.value === 'string' && child.value.includes('<a')) {
          const rewritten = unwrapRawAnchors(child.value);
          if (rewritten !== child.value) {
            unwrapped += 1;
            child.value = rewritten;
          }
        }
        walk(child);
        next.push(child);
      }
      node.children = next;
    };

    walk(tree);

    if (unwrapped > 0 && process.env.NEP_LINK_POLICY_LOG === '1') {
      console.log(`[nep-source-policy] unwrapped ${unwrapped} external anchor(s)`);
    }
  };
}
