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

export function docHref(id: string): string {
  const route = id === "index" ? "" : id.replace(/\/index$/u, "");
  return route ? `/docs/${route}` : "/docs";
}
