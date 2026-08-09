import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

const SITE_HOSTS = new Set(['cassiancreed.com', 'www.cassiancreed.com']);

// Keep readers on Cassian Creed when they follow a source citation. Applying
// this during Markdown rendering also covers future posts without requiring
// authors to remember target/rel attributes on every external link.
function externalLinksInNewTabs() {
  return (tree) => {
    const visit = (node) => {
      if (node?.type === 'element' && node.tagName === 'a') {
        const href = node.properties?.href;
        if (typeof href === 'string' && /^https?:\/\//i.test(href)) {
          const hostname = new URL(href).hostname.toLowerCase();
          if (!SITE_HOSTS.has(hostname)) {
            node.properties.target = '_blank';
            node.properties.rel = ['noopener', 'noreferrer'];
          }
        }
      }
      node?.children?.forEach(visit);
    };

    visit(tree);
  };
}

export default defineConfig({
  site: 'https://cassiancreed.com',
  integrations: [mdx()],
  markdown: {
    rehypePlugins: [externalLinksInNewTabs],
  },
});
