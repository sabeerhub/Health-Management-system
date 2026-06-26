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
  // Mimics the EXACT nesting structure layout.js produces (shell-main
  // wrapping topbar + main-content, flex:1 all the way down) but with
  // short, known-length text — isolates whether the huge gap comes from
  // this shell structure itself, or from something in each page's own
  // cloned template content.
  document.addEventListener("DOMContentLoaded", () => {
    const plain = document.createElement("div");
    plain.textContent = "✅ TEST 1: JS + DOM work.";
    plain.style.cssText =
      "background:#FACC15; color:#000; padding:14px; font-size:14px; font-weight:bold; position:relative; z-index:99999;";

    const shellTest = document.createElement("div");
    shellTest.style.cssText = "flex:1; display:flex; flex-direction:column; min-width:0; border:4px solid green; position:relative; z-index:99999;";
    shellTest.innerHTML = `
      <div class="topbar" style="border:4px solid red;">TEST 2 (topbar, real class)</div>
      <main class="main-content page-transition" style="border:4px solid blue; background:#fff;">TEST 3 (main-content, real class, real nesting)</main>
    `;

    const wrapper = document.createElement("div");
    wrapper.className = "app-shell";
    wrapper.style.cssText = "border:4px solid purple; position:relative; z-index:99999;";
    wrapper.appendChild(shellTest);

    document.body.prepend(wrapper);
    document.body.prepend(plain);
  });
}
