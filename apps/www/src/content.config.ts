import { glob } from 'astro/loaders'
import { defineCollection } from 'astro:content'
import { docsSchema } from '@astrojs/starlight/schema'
import { z } from 'astro/zod'

const docs = defineCollection({ schema: docsSchema() })

const blog = defineCollection({
  loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    draft: z.boolean().optional().default(false),
  }),
})

export const collections = { docs, blog }
