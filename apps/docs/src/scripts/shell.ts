let sidebarCollapsed = document.documentElement.classList.contains("sidebar-collapsed");
let sidebarViewportWidth = window.innerWidth;

function largestViewportHeight(): number {
  const visibleHeight = window.visualViewport?.height ?? window.innerHeight;
  if (!CSS.supports("height", "100lvh")) return visibleHeight;

  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;width:0;height:100lvh";
  document.documentElement.append(probe);
  const height = Math.max(visibleHeight, probe.getBoundingClientRect().height);
  probe.remove();
  return height;
}

function stabilizeDesktopSidebarHeight(force = false): void {
  const root = document.documentElement;
  const viewportWidth = window.innerWidth;
  const isDesktopTouchViewport = navigator.maxTouchPoints > 0 && !window.matchMedia("(max-width: 900px)").matches;

  if (!isDesktopTouchViewport) {
    root.style.removeProperty("--desktop-sidebar-height");
    sidebarViewportWidth = viewportWidth;
    return;
  }

  const widthChanged = Math.abs(viewportWidth - sidebarViewportWidth) > 1;
  if (force || widthChanged || !root.style.getPropertyValue("--desktop-sidebar-height")) {
    root.style.setProperty("--desktop-sidebar-height", `${largestViewportHeight()}px`);
  }
  sidebarViewportWidth = viewportWidth;
}

stabilizeDesktopSidebarHeight(true);
window.addEventListener("resize", () => stabilizeDesktopSidebarHeight());
window.visualViewport?.addEventListener("resize", () => stabilizeDesktopSidebarHeight());

function setSidebarOpen(open: boolean): void {
  document.documentElement.classList.toggle("sidebar-open", open);
  document.body.classList.toggle("sidebar-open", open);
}

function darkThemeEnabled(): boolean {
  const savedTheme = localStorage.getItem("cppref-theme");
  return savedTheme ? savedTheme === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyShellState(): void {
  const root = document.documentElement;
  root.classList.toggle("dark", darkThemeEnabled());
  root.classList.toggle("sidebar-collapsed", sidebarCollapsed);
  setSidebarOpen(false);
  stabilizeDesktopSidebarHeight();
}

document.addEventListener("astro:after-swap", applyShellState);

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Node)) return;
  const target = event.target instanceof Element ? event.target : event.target.parentElement;
  if (!target) return;

  const root = document.documentElement;
  if (target.closest("[data-theme-toggle]")) {
    const dark = !root.classList.contains("dark");
    root.classList.toggle("dark", dark);
    localStorage.setItem("cppref-theme", dark ? "dark" : "light");
    return;
  }
  if (target.closest("[data-sidebar-open]")) {
    setSidebarOpen(true);
    return;
  }
  if (target.closest("[data-sidebar-close]")) {
    setSidebarOpen(false);
    return;
  }
  if (!target.closest("[data-sidebar-toggle]")) return;
  if (window.matchMedia("(max-width: 900px)").matches) {
    setSidebarOpen(false);
    return;
  }
  sidebarCollapsed = !root.classList.contains("sidebar-collapsed");
  root.classList.toggle("sidebar-collapsed", sidebarCollapsed);
});
