import { defineConfig } from 'astro/config';
import rehypePlainExternalSources from './plugins/rehype-plain-external-sources.mjs';

export default defineConfig({
  site: 'https://cassiancreed.com',
  markdown: {
    // NEP editorial-source-link policy: source citations in article and case-file
    // body copy stay fully visible but stop being clickable. Internal links,
    // navigation, subscriber capture and checkout are untouched — see the plugin
    // header for exactly what is and is not in scope.
    rehypePlugins: [rehypePlainExternalSources],
  },
});
