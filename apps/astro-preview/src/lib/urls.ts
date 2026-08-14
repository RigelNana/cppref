const base = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL.replace(/\/$/u, "");

export function withBase(href: string): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  return `${base}${href}` || "/";
}

export function docHref(id: string): string {
  const route = id === "index" ? "" : id.replace(/\/index$/u, "");
  return route ? `/docs/${route}` : "/docs";
}
