import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tag: z.enum(['Case Files', 'Explainers', 'Verdict']).default('Case Files'),
    featured: z.boolean().default(false),
    archived: z.boolean().default(false),
    archiveNote: z.string().optional(),
    replacementPath: z.string().optional(),
    victim: z.string().optional(),
    incidentDate: z.string().optional(),
    location: z.string().optional(),
    jurisdiction: z.string().optional(),
    status: z.string().optional(),
    buyUrl: z.string().optional(),
    buyUrlAlt: z.string().optional(),
    buyPrice: z.string().optional(),
    capture: z.string().optional(),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    relatedBook: z.object({
      key: z.literal('jury-chess'),
      midCopy: z.string(),
      endCopy: z.string(),
    }).optional(),
  }),
});

export const collections = { posts };
