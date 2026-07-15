import { getCollection } from 'astro:content';
export async function GET(context: any) {
  const site = context.site?.href || 'https://cassiancreed.com/';
  const posts = await getCollection('posts');
  const urls = ['', 'case-files/', 'explainers/', 'start-here/', 'books/', 'about/', 'trending/', 'case-solver/', 'forensic-tools/', 'safety/', 'support/', 'ai-al/', 'guides/', 'glossary/', 'how-forensic-genetic-genealogy-works/', 'codis-vs-forensic-genetic-genealogy/', 'how-othram-works-in-a-case/', 'is-fgg-evidence-or-just-a-lead/', 'court-calendar/', 'voir-dire-simulator/', 'the-trail/', 'mission/', 'checklist/']
    .map(p => `${site}${p}`)
    .concat(posts.map(p => `${site}post/${p.slug}/`));
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${u}</loc></url>`).join('')}</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
