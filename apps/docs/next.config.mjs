import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
const basePath = process.env.GITHUB_ACTIONS === "true" && repository ? `/${repository}` : "";
process.env.NEXT_PUBLIC_BASE_PATH = basePath;

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  allowedDevOrigins: ["127.0.0.1"],
  output: "export",
  trailingSlash: true,
  basePath,
  images: {
    unoptimized: true,
  },
};

export default withMDX(config);
