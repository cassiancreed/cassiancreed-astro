import { defineCollection, z } from 'astro:content';
const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    tag: z.enum(['Case Files', 'Explainers']).default('Case Files'),
    featured: z.boolean().default(false),
    victim: z.string().optional(),
    incidentDate: z.string().optional(),
    location: z.string().optional(),
    jurisdiction: z.string().optional(),
    status: z.string().optional(),
    buyUrl: z.string().optional(),
    buyUrlAlt: z.string().optional(),
    buyPrice: z.string().optional(),
  }),
});
