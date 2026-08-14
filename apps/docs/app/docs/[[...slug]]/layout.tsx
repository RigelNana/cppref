import type { ReactNode } from "react";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { baseOptions } from "@/lib/layout.shared";
import { getPageTreeForPage } from "@/lib/source";

export default async function DocumentLayout(props: {
  children: ReactNode;
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;

  return (
    <DocsLayout
      tree={getPageTreeForPage(params.slug)}
      {...baseOptions()}
      sidebar={{ defaultOpenLevel: 0 }}
    >
      {props.children}
    </DocsLayout>
  );
}
