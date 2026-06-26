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

  // ---- Temporary diagnostic safety net ----
  // Surfaces ANY uncaught error or rejected promise directly on screen as a
  // visible red banner, instead of leaving a silent blank page. This is a
  // debugging aid while we track down a real bug, not permanent UI.
  function showFatalError(label, err) {
    const banner = document.createElement("div");
    banner.style.cssText =
      "position:fixed; top:0; left:0; right:0; z-index:9999; padding:16px; " +
      "background:#FEE2E2; border-bottom:3px solid #EF4444; color:#991B1B; " +
      "font-family:monospace; font-size:12px; white-space:pre-wrap; word-break:break-word; " +
      "max-height:60vh; overflow:auto;";
    const message = (err && (err.stack || err.message)) || String(err);
    banner.textContent = `${label} — please screenshot this:\n${message}`;
    document.body.appendChild(banner);
  }
  window.addEventListener("error", (e) => showFatalError("Script error", e.error || e.message));
  window.addEventListener("unhandledrejection", (e) => showFatalError("Unhandled promise rejection", e.reason));

  // ---- Temporary control test ----
  // A banner using ONLY inline styles, zero dependency on our CSS files or
  // design system. If this doesn't show up, the problem isn't our CSS —
  // something more fundamental is blocking script-inserted content.
  document.addEventListener("DOMContentLoaded", () => {
    const banner = document.createElement("div");
    banner.textContent = "✅ JS CONTROL TEST — if you can read this yellow banner, JavaScript and DOM insertion both work fine on this device.";
    banner.style.cssText =
      "background:#FACC15; color:#000; padding:14px; font-size:15px; font-weight:bold; " +
      "text-align:center; position:relative; z-index:99999;";
    document.body.prepend(banner);
  });
}
