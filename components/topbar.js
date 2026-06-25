// ==========================================================================
// FUD HEALTH HMS — TOPBAR COMPONENT
// ==========================================================================

import { icon } from "./icons.js";

export function renderTopbar({ title, profile }) {
  const initials = (profile?.full_name || "U")
    .split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

  return `
    <header class="topbar">
      <h2 style="font-size: var(--fs-md);">${title}</h2>
      <div class="topbar-actions">
        <button class="icon-btn" aria-label="Notifications">
          ${icon("bell", 20)}
          <span class="dot"></span>
        </button>
        <div style="display:flex; align-items:center; gap: var(--space-2);">
          <div class="avatar" style="display:flex; align-items:center; justify-content:center; background:var(--color-role-light, var(--color-primary-light)); color: var(--color-role, var(--color-primary)); font-weight:700; font-size: var(--fs-sm);">${initials}</div>
          <div style="display:none;" class="topbar-name-full">
            <div style="font-weight:600; font-size: var(--fs-sm);">${profile?.full_name || ""}</div>
          </div>
        </div>
      </div>
    </header>
  `;
}
