import { getCollection } from 'astro:content';
import { indexablePageRoutes, isRedirected, readRedirectSources, sourceLastmod, xml } from '../utils/search-index.mjs';

export async function GET(context: any) {
  const site = context.site?.href || 'https://cassiancreed.com/';
  const redirects = readRedirectSources();
  const pages = indexablePageRoutes().map(({ route, source }) => ({
    route, lastmod: sourceLastmod(route, source),
  }));
  const posts = (await getCollection('posts'))
    .filter((post) => !post.data.archived && !isRedirected('/post/' + post.slug + '/', redirects))
    .map((post) => ({
      route: '/post/' + post.slug + '/',
      lastmod: (post.data.updatedDate ?? post.data.pubDate).toISOString().slice(0, 10),
    }));
  const entries = [...pages, ...posts].sort((a, b) => a.route.localeCompare(b.route));
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    entries.map(({ route, lastmod }) => '<url><loc>' + xml(new URL(route, site).href) + '</loc>' +
      (lastmod ? '<lastmod>' + lastmod + '</lastmod>' : '') + '</url>').join('') + '</urlset>';
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
