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
 *   - Anything outside Markdown body content: site navigation, the subscriber
 *     capture block, checkout and product links, and social share buttons all live
 *     in layouts and page templates and never pass through this plugin.
 *
 * Bare URLs typed into Markdown are autolinked by GFM before this plugin runs, so
 * they arrive here as anchors and are unwrapped by the same pass. That satisfies the
 * "no raw clickable URL" rule without disabling GFM anywhere else.
 */

const INTERNAL_HOSTS = new Set(['cassiancreed.com', 'www.cassiancreed.com']);

function isExternalHttpLink(href) {
  if (typeof href !== 'string') return false;
  const value = href.trim();
  if (!/^https?:\/\//i.test(value)) return false; // internal, relative, anchor, mailto, tel
  let host;
  try {
    host = new URL(value).hostname.toLowerCase();
  } catch {
    return false; // unparseable — leave it exactly as authored
  }
  if (INTERNAL_HOSTS.has(host)) return false;
  return !host.endsWith('.cassiancreed.com');
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
