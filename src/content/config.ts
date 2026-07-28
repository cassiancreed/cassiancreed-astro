import { defineCollection, z } from 'astro:content';
const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tag: z.enum(['Case Files', 'Explainers', 'Verdict']).default('Case Files'),
    featured: z.boolean().default(false),
    victim: z.string().optional(),
    incidentDate: z.string().optional(),
    location: z.string().optional(),
    jurisdiction: z.string().optional(),
    status: z.string().optional(),
    buyUrl: z.string().optional(),
    buyUrlAlt: z.string().optional(),
    buyPrice: z.string().optional(),
    capture: z.string().optional(),
    // Opt-in only (defaults false, so no existing post changes): suppress the
    // template's "The Trail — ebook" aside in the convert block. Used on posts
    // where a book-sales CTA is inappropriate and email capture is the single
    // conversion action (NEP D4vd stand-trial build, 2026-07-27).
    hideBookOffer: z.boolean().default(false),
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});
export const collections = { posts };
