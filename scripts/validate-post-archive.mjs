import fs from 'node:fs';
import path from 'node:path';

const postsDirectory = new URL('../src/content/posts/', import.meta.url);
const archiveTags = new Set(['Case Files', 'Explainers']);
const failures = [];
const archivePosts = [];

const readField = (frontmatter, field) => {
  const match = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim().replace(/^(["'])(.*)\1$/, '$2') ?? '';
};

for (const filename of fs.readdirSync(postsDirectory).filter((name) => /\.mdx?$/.test(name))) {
  const source = fs.readFileSync(new URL(filename, postsDirectory), 'utf8');
  const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  if (!frontmatter) {
    failures.push(`${filename}: missing YAML front matter`);
    continue;
  }

  // The Astro content schema defaults an omitted tag to Case Files.
  const tag = readField(frontmatter, 'tag') || 'Case Files';
  if (!archiveTags.has(tag)) continue;

  const title = readField(frontmatter, 'title');
  const description = readField(frontmatter, 'description');
  const pubDate = readField(frontmatter, 'pubDate');

  if (!title) failures.push(`${filename}: missing title`);
  if (!description) failures.push(`${filename}: missing description used by archive search and cards`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pubDate) || Number.isNaN(Date.parse(`${pubDate}T00:00:00Z`))) {
    failures.push(`${filename}: pubDate must be a valid YYYY-MM-DD date`);
  }

  archivePosts.push({ filename, tag, title, pubDate });
}

if (failures.length) {
  console.error(`Blog archive invalid:\n- ${failures.join('\n- ')}`);
  process.exit(1);
}

archivePosts.sort((a, b) => b.pubDate.localeCompare(a.pubDate));
const counts = Object.fromEntries(
  [...archiveTags].map((tag) => [tag, archivePosts.filter((post) => post.tag === tag).length]),
);
const newest = archivePosts[0];

console.log(
  `Blog archive valid: ${counts['Case Files']} case files, ${counts.Explainers} explainers. ` +
  `Newest: ${newest?.pubDate ?? 'none'} — ${newest?.title ?? 'none'}.`,
);
