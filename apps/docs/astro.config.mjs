import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";

const base = process.env.ASTRO_BASE_PATH ?? "/";
const site = process.env.ASTRO_SITE_URL ?? (process.env.NODE_ENV === "production" ? "https://cppref.cc" : "http://localhost:4321");

export default defineConfig({
  base,
  compressHTML: true,
  build: {
    format: "directory",
    inlineStylesheets: "never",
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
  prefetch: {
    defaultStrategy: "hover",
    prefetchAll: true,
  },
  output: "static",
  site,
  trailingSlash: "always",
});
