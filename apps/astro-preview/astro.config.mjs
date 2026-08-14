import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";

const base = process.env.ASTRO_BASE_PATH ?? "/";

export default defineConfig({
  base,
  build: {
    format: "directory",
  },
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      themes: {
        light: "github-light",
        dark: "github-dark",
      },
      wrap: true,
    },
  },
  output: "static",
  site: process.env.ASTRO_SITE_URL ?? "http://localhost:4321",
  trailingSlash: "ignore",
});
