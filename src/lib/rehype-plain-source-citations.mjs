/**
 * rehype-plain-source-citations
 *
 * Editorial-source-link policy (NEP, July 2026).
 *
 * Readers should never be handed a clickable link that takes them off the NEP
 * site to read a source. Sources still have to be named, in full, so a reader
 * can go find them on their own. So: every outbound link in post body copy is
 * turned into plain text. The words stay exactly as written; only the click
 * goes away.
 *
 * What is left alone:
 *   - internal NEP links (relative paths, anchors, cassiancreed.com)
 *   - operational links: the store and newsletter (Beehiiv), NEP's own show and
 *     channel, and crisis/support helplines. These are not source citations.
 *     They are listed in OPERATIONAL below so the exceptions stay auditable.
 *
 * This runs as a user rehype plugin, which Astro schedules BEFORE rehype-raw,
 * so hand-written HTML inside a Markdown file is still an unparsed `raw` string
 * at this point. Both shapes are handled: real <a> elements and raw HTML.
 */

// A link is operational (kept clickable) only if it matches one of these.
// Anything else pointing off-site is treated as an editorial source citation.
const OPERATIONAL = [
  // Internal NEP — absolute form of a same-site link.
  /^https?:\/\/(www\.)?cassiancreed\.com(?:[/?#]|$)/i,
  // Store, checkout, subscriber capture.
  /^https?:\/\/[a-z0-9-]+\.beehiiv\.com(?:[/?#]|$)/i,
  // NEP's own audio/video channels.
  /^https?:\/\/open\.spotify\.com(?:[/?#]|$)/i,
  /^https?:\/\/(www\.)?youtube\.com\/@CassianCreed/i,
  // NEP's own social account.
  /^https?:\/\/(www\.)?x\.com\/CassianCreed/i,
  // Crisis and support helplines — reader-safety, not citations.
  /^https?:\/\/988lifeline\.org(?:[/?#]|$)/i,
  /^https?:\/\/postpartum\.net(?:[/?#]|$)/i,
  /^https?:\/\/(www\.)?thehotline\.org(?:[/?#]|$)/i,
  /^https?:\/\/(www\.)?rainn\.org(?:[/?#]|$)/i,
  /^https?:\/\/humantraffickinghotline\.org(?:[/?#]|$)/i,
  /^https?:\/\/(www\.)?stalkingawareness\.org(?:[/?#]|$)/i,
  /^https?:\/\/anad\.org(?:[/?#]|$)/i,
];

/** True for a link that should stop being clickable. */
export function isEditorialSourceLink(href) {
  if (typeof href !== 'string') return false;
  const url = href.trim();
  // Relative paths, in-page anchors, mail and phone links are all internal or
  // operational by definition.
  if (!/^https?:\/\//i.test(url)) return false;
  return !OPERATIONAL.some((re) => re.test(url));
}

// Matches one opening <a ...> tag and captures its href value.
const RAW_ANCHOR_OPEN = /<a\b([^>]*)>/gi;
const HREF_IN_ATTRS = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

/**
 * Rewrite anchors inside a raw HTML string. Only anchors whose href is an
 * editorial source link are touched; the tag becomes a <span>, and its matching
 * </a> becomes </span>. Nested anchors are not legal HTML, so pairing the next
 * closing tag is safe.
 */
function rewriteRawHtml(value) {
  let out = '';
  let cursor = 0;
  RAW_ANCHOR_OPEN.lastIndex = 0;
  let match;
  while ((match = RAW_ANCHOR_OPEN.exec(value)) !== null) {
    const attrs = match[1] || '';
    const hrefMatch = HREF_IN_ATTRS.exec(attrs);
    const href = hrefMatch ? (hrefMatch[1] ?? hrefMatch[2] ?? hrefMatch[3] ?? '') : '';
    if (!isEditorialSourceLink(href)) continue;

    const closeIdx = value.toLowerCase().indexOf('</a>', RAW_ANCHOR_OPEN.lastIndex);
    if (closeIdx === -1) continue; // opening tag closes in a later raw node; leave it.

    out += value.slice(cursor, match.index);
    out += '<span class="src-ref">';
    out += value.slice(RAW_ANCHOR_OPEN.lastIndex, closeIdx);
    out += '</span>';
    cursor = closeIdx + 4;
    RAW_ANCHOR_OPEN.lastIndex = cursor;
  }
  return cursor === 0 ? value : out + value.slice(cursor);
}

export default function rehypePlainSourceCitations() {
  return function transformer(tree) {
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;

      if (node.type === 'raw' && typeof node.value === 'string' && node.value.includes('<a')) {
        node.value = rewriteRawHtml(node.value);
      }

      if (
        node.type === 'element' &&
        node.tagName === 'a' &&
        isEditorialSourceLink(node.properties && node.properties.href)
      ) {
        node.tagName = 'span';
        const props = node.properties || {};
        delete props.href;
        delete props.target;
        delete props.rel;
        delete props.download;
        delete props.ping;
        const classes = Array.isArray(props.className)
          ? props.className
          : props.className
            ? [props.className]
            : [];
        if (!classes.includes('src-ref')) classes.push('src-ref');
        props.className = classes;
        node.properties = props;
      }

      if (Array.isArray(node.children)) node.children.forEach(walk);
    };
    walk(tree);
  };
}
