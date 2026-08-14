import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const docs = defineCollection({
  loader: glob({
    base: "../docs/content/docs",
    generateId: ({ entry }) => entry.replace(/\.mdx$/u, ""),
    pattern: ["index.mdx", "c/**/*.mdx", "cpp/**/*.mdx"],
  }),
  schema: z.object({
    description: z.string(),
    language: z.enum(["C", "C++"]).optional(),
    source_url: z.url().optional(),
    title: z.string(),
  }),
});

export const collections = { docs };
