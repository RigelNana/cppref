const base = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL.replace(/\/$/u, "");

export function withBase(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const suffixIndex = href.search(/[?#]/u);
  const pathname = suffixIndex === -1 ? href : href.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : href.slice(suffixIndex);
  const normalizedPathname =
    (pathname === "/docs" || pathname.startsWith("/docs/")) && !pathname.endsWith("/") ? `${pathname}/` : pathname;
  return `${base}${normalizedPathname}${suffix}` || "/";
}

export function docRoute(id: string, ids: ReadonlySet<string>): string {
  if (id === "index") return "";
  if (!id.endsWith("/index")) return id;
  const parentId = id.slice(0, id.length - "/index".length);
  return ids.has(parentId) ? id : parentId;
}

export function docHref(id: string, ids: ReadonlySet<string>): string {
  const route = docRoute(id, ids);
  return route ? `/docs/${route}` : "/docs";
}
