import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { DOC_SECTIONS } from './lib/docs-sections';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.enum(DOC_SECTIONS),
    order: z.number(),
    /** `beta` marks pages that describe features that are still in beta. */
    status: z.enum(['stable', 'beta']).default('stable'),
  }),
});

const examples = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/examples' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number(),
    /** Documentation pages that explain the APIs this example uses. */
    related: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
  }),
});

export const collections = { docs, examples };
