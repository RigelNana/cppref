import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { docHref, withBase } from "@/lib/urls";

export const GET: APIRoute = async () => {
  const entries = await getCollection("docs");
  const ids = new Set(entries.map((entry) => entry.id));
  const index = entries
    .map((entry) => ({
      description: entry.data.description,
      href: withBase(docHref(entry.id, ids)),
      title: entry.data.title,
    }))
    .sort((left, right) => left.title.localeCompare(right.title));

  return new Response(JSON.stringify(index), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
};
