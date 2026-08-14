import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

// The site is served at the domain root (https://cppref.cc). Set
// NEXT_PUBLIC_BASE_PATH=/cppref in the workflow only when deploying to a
// GitHub Pages subpath again (e.g. https://user.github.io/cppref/).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
process.env.NEXT_PUBLIC_BASE_PATH = basePath;

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  output: "export",
  trailingSlash: true,
  basePath,
  enablePrerenderSourceMaps: false,
  experimental: {
    turbopackSourceMaps: false,
    turbopackInputSourceMaps: false,
  },
  images: {
    unoptimized: true,
  },
};

export default withMDX(config);
