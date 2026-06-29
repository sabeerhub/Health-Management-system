// ==========================================================================
// FUD HEALTH HMS — LAYOUT COMPONENT
// Every protected dashboard page calls initLayout() once on load. It:
//   1. Verifies the session + role with requireRole() (real Supabase check,
//      redirects to /pages/login.html if not authenticated/authorized).
//   2. Injects the role-themed sidebar + topbar into #appShellRoot.
//   3. Moves the page's own <template id="pageContent"> markup into
//      #mainContent, so each page only has to write its unique content.
//   4. Wires the Log out link to the real supabase.auth.signOut() call.
// ==========================================================================

import { requireRole, logout } from "/assets/js/auth.js?v2";
import { renderSidebar } from "/components/sidebar.js?v2";
import { renderTopbar } from "/components/topbar.js?v2";

export async function initLayout({ role, active, title }) {
  try {
    document.body.setAttribute("data-role", role);

    const profile = await requireRole(role);
    if (!profile) return null; // requireRole already redirected

    const root = document.getElementById("appShellRoot");
    root.innerHTML = `
      ${renderSidebar(role, active)}
      <div class="sidebar-backdrop" id="sidebarBackdrop"></div>
      <div class="shell-main">
        ${renderTopbar({ title, profile })}
        <main class="main-content page-transition" id="mainContent"></main>
      </div>
    `;

    const tpl = document.getElementById("pageContent");
    if (tpl) {
      document.getElementById("mainContent").appendChild(tpl.content.cloneNode(true));
    }

    const logoutLink = document.getElementById("logoutLink");
    if (logoutLink) {
      logoutLink.addEventListener("click", async (e) => {
        e.preventDefault();
        await logout();
      });
    }

    // Mobile drawer: menu button opens it, close button / backdrop close it.
    const sidebar = document.getElementById("appSidebar");
    const backdrop = document.getElementById("sidebarBackdrop");
    const menuToggleBtn = document.getElementById("menuToggleBtn");
    const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");

    const openDrawer = () => { sidebar.classList.add("open"); backdrop.classList.add("open"); };
    const closeDrawer = () => { sidebar.classList.remove("open"); backdrop.classList.remove("open"); };

    if (menuToggleBtn) menuToggleBtn.addEventListener("click", openDrawer);
    if (sidebarCloseBtn) sidebarCloseBtn.addEventListener("click", closeDrawer);
    if (backdrop) backdrop.addEventListener("click", closeDrawer);

    return profile;
  } catch (err) {
    // Surface the real error directly on screen instead of a silent blank
    // page — this is a temporary diagnostic aid while we track down the
    // mobile rendering issue, not permanent UI.
    const root = document.getElementById("appShellRoot");
    if (root) {
      root.innerHTML = `
        <div style="padding: 24px; background: #FEE2E2; border: 2px solid #EF4444; border-radius: 12px; margin: 16px; font-family: monospace; font-size: 13px; color: #991B1B; white-space: pre-wrap; word-break: break-word;">
          <strong>Layout error (please screenshot this):</strong>
          ${err && err.stack ? err.stack : (err && err.message) || String(err)}
        </div>
      `;
    }
    console.error("initLayout failed:", err);
    return null;
  }
}
