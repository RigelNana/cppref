import type * as PageTree from "fumadocs-core/page-tree";
import { loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";


const docs = defineDocs({
  dir: "content/docs",
});

export const source = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

function containsPage(node: PageTree.Node, url: string): boolean {
  if (node.type === "page") return node.url === url;
  if (node.type !== "folder") return false;
  if (node.index?.url === url) return true;
  return node.children.some((child) => containsPage(child, url));
}

function summarizeFolder(folder: PageTree.Folder): PageTree.Folder {
  if (folder.index) return { ...folder, children: [] };

  return {
    ...folder,
    children: folder.children.map((child) =>
      child.type === "folder" ? { ...child, children: [] } : child,
    ),
  };
}

function pruneFolder(folder: PageTree.Folder, url: string): PageTree.Folder {
  return {
    ...folder,
    children: folder.children.map((child) => {
      if (child.type !== "folder") return child;
      return containsPage(child, url) ? pruneFolder(child, url) : summarizeFolder(child);
    }),
  };
}

function pruneTree(tree: PageTree.Root, url: string): PageTree.Root {
  return {
    ...tree,
    children: tree.children.map((child) => {
      if (child.type !== "folder") return child;
      return containsPage(child, url) ? pruneFolder(child, url) : summarizeFolder(child);
    }),
    ...(tree.fallback ? { fallback: pruneTree(tree.fallback, url) } : {}),
  };
}

export function getPageTreeForPage(slugs: string[] | undefined): PageTree.Root {
  const tree = source.getPageTree();
  const page = source.getPage(slugs);
  return page ? pruneTree(tree, page.url) : tree;
}
