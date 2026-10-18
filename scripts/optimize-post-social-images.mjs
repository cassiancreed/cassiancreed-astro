// Preserve original artwork; make padded social cards without cropping cover text.
import sharp from 'sharp';
import { readdirSync, readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { postSocialImage } from '../src/utils/post-social-images.mjs';

const results = [];
mkdirSync('public/og', { recursive: true });
for (const file of readdirSync('src/content/posts').filter((file) => /\.mdx?$/.test(file))) {
  const slug = file.replace(/\.mdx?$/, '');
  const text = readFileSync(resolve('src/content/posts', file), 'utf8');
  const frontmatter = text.split(/^---\s*$/m)[1] ?? '';
  const cover = frontmatter.match(/^cover:\s*(.+?)\s*$/m)?.[1]?.replace(/^["']|["']$/g, '');
  const requested = slug === 'tupac-shakur-homicide-evidence-evolution'
    ? '/og/why-was-keffe-d-convicted-tupac-shakur.png' : cover ?? '/og/' + slug + '.png';
  if (requested.startsWith('http')) continue;
  const source = resolve('public', requested.slice(1));
  if (!existsSync(source) || statSync(source).size <= 1_000_000) continue;
  const target = resolve('public/og', slug + '.jpg');
  let output;
  for (const quality of [85, 75, 65, 55, 45]) {
    output = await sharp(source).rotate()
      .resize(1200, 630, { fit: 'contain', background: '#14110f' })
      .flatten({ background: '#14110f' }).jpeg({ quality, mozjpeg: true }).toBuffer();
    if (output.length < 300_000) break;
  }
  if (output.length >= 300_000) throw new Error('Social card exceeds 300 KB: ' + slug);
  writeFileSync(target, output);
  const metadata = await sharp(target).metadata();
  if (metadata.width !== 1200 || metadata.height !== 630 || postSocialImage(slug, requested) !== '/og/' + slug + '.jpg') {
    throw new Error('Invalid social card: ' + slug);
  }
  results.push({ slug, original: requested, originalBytes: statSync(source).size, image: '/og/' + slug + '.jpg', bytes: statSync(target).size });
}
console.log('SEO_IMAGES=' + JSON.stringify(results));
