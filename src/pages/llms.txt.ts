import { getCollection } from 'astro:content';
export async function GET(context: any) {
  const site = context.site?.href || 'https://www.cassiancreed.com/';
  const posts = (await getCollection('posts')).sort((a,b)=> b.data.pubDate.valueOf()-a.data.pubDate.valueOf());
  const cf = posts.filter(p=>p.data.tag==='Case Files');
  const ex = posts.filter(p=>p.data.tag==='Explainers');
  const line = (p:any)=> `- [${p.data.title}](${site}post/${p.slug}/): ${p.data.description}`;
  const body = `# Cassian Creed — The Case Files\n> Sourced, victim-centered true-crime case files and plain-language explainers from Neural Edge Publishing. Every account is built on the public record; victims are named in life first.\n\n## Case Files\n${cf.map(line).join('\n')}\n\n## Explainers\n${ex.map(line).join('\n')}\n\n## About\n- [How we report](${site}about/): sourcing, victim dignity, no gratuitous detail, corrections policy.\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
