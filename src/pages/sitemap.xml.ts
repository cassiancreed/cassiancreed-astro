import { getCollection } from 'astro:content';
import { readFileSync } from 'node:fs';

function normalizePath(path: string) {
  if (!path.startsWith('/') || path.includes('*') || path.includes(':')) return null;
  const withoutTrailingSlash = path.replace(/\/+$/, '') || '/';
  return withoutTrailingSlash === '/' ? '/' : `${withoutTrailingSlash}/`;
}

function redirectedPaths() {
  const redirectFile = readFileSync(new URL('../../public/_redirects', import.meta.url), 'utf8');
  return new Set(
    redirectFile
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => normalizePath(line.split(/\s+/)[0]))
      .filter((path): path is string => Boolean(path))
  );
}

export async function GET(context: any) {
  const site = context.site?.href || 'https://cassiancreed.com/';
  const posts = await getCollection('posts');
  const redirects = redirectedPaths();
  const paths = ['', 'case-files/', 'explainers/', 'start-here/', 'books/', 'about/', 'trending/', 'case-solver/', 'forensic-tools/', 'safety/', 'support/', 'ai-al/', 'guides/', 'how-dna-remembers/', 'glossary/', 'how-forensic-genetic-genealogy-works/', 'codis-vs-forensic-genetic-genealogy/', 'how-othram-works-in-a-case/', 'is-fgg-evidence-or-just-a-lead/', 'is-forensic-genetic-genealogy-legal/', 'baby-jacob-round-lake-beach-genetic-genealogy/', 'court-calendar/', 'court-calendar-policy/', 'voir-dire-simulator/', 'mission/']
    .concat(posts.map(p => `post/${p.slug}/`));
  const urls = paths
    .filter(path => !redirects.has(normalizePath(`/${path}`) ?? ''))
    .map(path => `${site}${path}`);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>${u}</loc></url>`).join('')}</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
