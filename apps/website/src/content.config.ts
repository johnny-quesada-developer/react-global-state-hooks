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
    /** `beta` marks pages that describe features not yet on the npm `latest` tag. */
    status: z.enum(['stable', 'beta']).default('stable'),
  }),
});

export const collections = { docs };
