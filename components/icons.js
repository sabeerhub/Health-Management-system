// ==========================================================================
// FUD HEALTH HMS — ICONS
// Real Lucide icons (https://lucide.dev), loaded via CDN script tag on every
// page. icon() emits a <i data-lucide="..."> placeholder; Lucide's own
// createIcons() swaps it for the real inline SVG. Because so much of this
// app injects HTML dynamically (tables, modals, stat cards), we don't rely
// on remembering to call createIcons() after every render — a MutationObserver
// below calls it automatically whenever the DOM changes, anywhere on the page.
// ==========================================================================

// Internal icon key -> real Lucide icon name.
const NAME_MAP = {
  dashboard:    "layout-dashboard",
  staff:        "users",
  doctor:       "stethoscope",
  patients:     "users",
  appointments: "calendar",
  payments:     "wallet",
  settings:     "settings",
  logout:       "log-out",
  bell:         "bell",
  search:       "search",
  pill:         "pill",
  stock:        "package",
  history:      "history",
  prescription: "clipboard",
  plus:         "plus",
  trash:        "trash-2",
  check:        "check",
  close:        "x",
  eye:          "eye",
  download:     "download",
  card:         "credit-card",
  alert:        "alert-triangle",
  chevronRight: "chevron-right",
  user:         "user",
  calendarPlus: "calendar-plus",
  shield:       "shield",
  activity:     "activity",
  hospital:     "building-2",
};

export function icon(name, size = 20, strokeWidth = 1.7) {
  const lucideName = NAME_MAP[name] || name;
  return `<i data-lucide="${lucideName}" style="width:${size}px;height:${size}px;display:inline-block;vertical-align:middle;stroke-width:${strokeWidth};"></i>`;
}

/** Manual escape hatch — call after injecting icon markup if you ever need it synchronously. */
export function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

// ---- Auto-refresh: no page or component needs to remember to call this ----
if (typeof window !== "undefined") {
  let scheduled = false;
  const scheduleRefresh = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      refreshIcons();
    });
  };
  document.addEventListener("DOMContentLoaded", scheduleRefresh);
  new MutationObserver(scheduleRefresh).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
