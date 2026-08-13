import { createSearchAPI } from "fumadocs-core/search/server";
import type { StructuredData } from "fumadocs-core/mdx-plugins/remark-structure";
import { source } from "@/lib/source";

type Page = Awaited<ReturnType<typeof source.getPages>>[number];

async function pageText(page: Page): Promise<string> {
  const data = page.data.structuredData as
    | StructuredData
    | (() => StructuredData | Promise<StructuredData>)
    | undefined;
  if (!data) return page.data.title ?? page.url;
  const sd = typeof data === "function" ? await data() : data;
  return [
    ...(sd?.headings.map((heading) => heading.content) ?? []),
    ...(sd?.contents.map((content) => content.content) ?? []),
  ].join("\n");
}

export const search = createSearchAPI("simple", {
  indexes: async () =>
    Promise.all(
      source.getPages().map(async (page) => ({
        title: page.data.title ?? page.url,
        description: page.data.description,
        url: page.url,
        content: await pageText(page),
      })),
    ),
});
