import { getCollection } from 'astro:content';
export async function GET(context: any) {
  const site = context.site?.href || 'https://www.cassiancreed.com/';
  const posts = (await getCollection('posts')).sort((a,b)=> b.data.pubDate.valueOf()-a.data.pubDate.valueOf());
  const items = posts.map(p => `<item><title><![CDATA[${p.data.title}]]></title><link>${site}post/${p.slug}/</link><guid>${site}post/${p.slug}/</guid><description><![CDATA[${p.data.description}]]></description><pubDate>${p.data.pubDate.toUTCString()}</pubDate></item>`).join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>The Case Files of Cassian Creed</title><link>${site}</link><description>Sourced, victim-centered true-crime case files.</description>${items}</channel></rss>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
}
