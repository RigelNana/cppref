import type { CollectionEntry } from "astro:content";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { docHref } from "./urls";

export interface NavNode {
  children?: NavNode[] | undefined;
  href?: string | undefined;
  id: string;
  kind: "folder" | "page";
  title: string;
}

export interface Breadcrumb {
  href?: string | undefined;
  title: string;
}

type DocEntry = CollectionEntry<"docs">;

interface MetaFile {
  pages?: string[] | undefined;
  title?: string | undefined;
}

const contentRoot = resolve(process.cwd(), "content/docs");
let cachedNavigation: NavNode[] | undefined;
const pageCache = new WeakMap<NavNode[], NavNode[]>();


function readMeta(relativeDirectory: string): MetaFile | undefined {
  const path = `${contentRoot}/${relativeDirectory ? `${relativeDirectory}/` : ""}meta.json`;
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as MetaFile;
}

function directoryEntries(relativeDirectory: string, meta: MetaFile | undefined): string[] {
  if (meta?.pages) return meta.pages;
  const path = `${contentRoot}/${relativeDirectory}`;
  return readdirSync(path, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isDirectory()) return [entry.name];
      if (entry.isFile() && entry.name.endsWith(".mdx") && entry.name !== "index.mdx") {
        return [entry.name.slice(0, -4)];
      }
      return [];
    })
    .sort((left, right) => left.localeCompare(right));
}

function buildDirectory(relativeDirectory: string, titles: ReadonlyMap<string, string>): NavNode[] {
  const meta = readMeta(relativeDirectory);
  return directoryEntries(relativeDirectory, meta).flatMap<NavNode>((name) => {
    const id = relativeDirectory ? `${relativeDirectory}/${name}` : name;
    const directoryPath = `${contentRoot}/${id}`;
    if (existsSync(directoryPath)) {
      const childMeta = readMeta(id);
      const indexId = `${id}/index`;
      const hasIndex = titles.has(indexId);
      return [{
        children: buildDirectory(id, titles),
        href: hasIndex ? docHref(indexId) : undefined,
        id,
        kind: "folder" as const,
        title: childMeta?.title ?? titles.get(indexId) ?? name.replaceAll("_", " "),
      }];
    }

    if (!titles.has(id)) return [];
    return [{
      href: docHref(id),
      id,
      kind: "page" as const,
      title: titles.get(id) ?? name.replaceAll("_", " "),
    }];
  });
}

export function buildNavigation(entries: DocEntry[]): NavNode[] {
  if (cachedNavigation) return cachedNavigation;
  const titles = new Map(entries.map((entry) => [entry.id, entry.data.title]));
  cachedNavigation = buildDirectory("", titles);
  return cachedNavigation;
}

function findBreadcrumbs(nodes: NavNode[], currentId: string, trail: Breadcrumb[]): Breadcrumb[] | undefined {
  for (const node of nodes) {
    const containsCurrent = currentId === node.id || currentId === `${node.id}/index` || currentId.startsWith(`${node.id}/`);
    if (!containsCurrent) continue;
    const nextTrail = [...trail, { href: node.href, title: node.title }];
    if (currentId === node.id || currentId === `${node.id}/index`) return nextTrail;
    const nested = node.children ? findBreadcrumbs(node.children, currentId, nextTrail) : undefined;
    return nested ?? nextTrail;
  }
  return undefined;
}

export function breadcrumbsFor(nodes: NavNode[], currentId: string): Breadcrumb[] {
  return findBreadcrumbs(nodes, currentId, []) ?? [];
}

function flattenPages(nodes: NavNode[], pages: NavNode[]): void {
  for (const node of nodes) {
    if (node.href) pages.push(node);
    if (node.children) flattenPages(node.children, pages);
  }
}

export function adjacentPages(nodes: NavNode[], currentId: string): { next?: NavNode | undefined; previous?: NavNode | undefined } {
  let pages = pageCache.get(nodes);
  if (!pages) {
    pages = [];
    flattenPages(nodes, pages);
    pageCache.set(nodes, pages);
  }
  const href = docHref(currentId);
  const index = pages.findIndex((page) => page.href === href);
  return {
    next: index >= 0 ? pages[index + 1] : undefined,
    previous: index > 0 ? pages[index - 1] : undefined,
  };
}
