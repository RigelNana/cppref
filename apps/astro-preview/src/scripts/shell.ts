let sidebarCollapsed = document.documentElement.classList.contains("sidebar-collapsed");

function darkThemeEnabled(): boolean {
  const savedTheme = localStorage.getItem("cppref-theme");
  return savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyShellState(): void {
  const root = document.documentElement;
  root.classList.toggle("dark", darkThemeEnabled());
  root.classList.toggle("sidebar-collapsed", sidebarCollapsed);
  document.body.classList.remove("sidebar-open");
}

document.addEventListener("astro:after-swap", applyShellState);

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Node)) return;
  const target = event.target instanceof Element ? event.target : event.target.parentElement;
  if (!target) return;

  const root = document.documentElement;
  const body = document.body;
  if (target.closest("[data-theme-toggle]")) {
    const dark = !root.classList.contains("dark");
    root.classList.toggle("dark", dark);
    localStorage.setItem("cppref-theme", dark ? "dark" : "light");
    return;
  }
  if (target.closest("[data-sidebar-open]")) {
    body.classList.add("sidebar-open");
    return;
  }
  if (target.closest("[data-sidebar-close]")) {
    body.classList.remove("sidebar-open");
    return;
  }
  if (!target.closest("[data-sidebar-toggle]")) return;
  if (window.matchMedia("(max-width: 900px)").matches) {
    body.classList.remove("sidebar-open");
    return;
  }
  sidebarCollapsed = !root.classList.contains("sidebar-collapsed");
  root.classList.toggle("sidebar-collapsed", sidebarCollapsed);
});
