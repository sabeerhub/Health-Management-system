// ==========================================================================
// FUD HEALTH HMS — SIDEBAR COMPONENT
// ==========================================================================

import { icon } from "./icons.js";

const NAV_BY_ROLE = {
  admin: [
    { key: "dashboard",    label: "Dashboard",    href: "/pages/admin/dashboard.html",    icon: "dashboard" },
    { key: "doctors",      label: "Doctors",      href: "/pages/admin/doctors.html",      icon: "doctor" },
    { key: "staff",        label: "Pharmacists",  href: "/pages/admin/staff.html",        icon: "staff" },
    { key: "patients",     label: "Patients",     href: "/pages/admin/patients.html",     icon: "patients" },
    { key: "appointments", label: "Appointments", href: "/pages/admin/appointments.html", icon: "appointments" },
    { key: "payments",     label: "Payments",     href: "/pages/admin/payments.html",     icon: "payments" },
    { key: "settings",     label: "Settings",     href: "/pages/admin/settings.html",      icon: "settings" },
  ],
  doctor: [
    { key: "dashboard",     label: "Dashboard",     href: "/pages/doctor/dashboard.html",     icon: "dashboard" },
    { key: "patients",      label: "Patients",      href: "/pages/doctor/patients.html",      icon: "patients" },
    { key: "appointments",  label: "Appointments",  href: "/pages/doctor/appointments.html",  icon: "appointments" },
    { key: "prescriptions", label: "Prescriptions", href: "/pages/doctor/prescriptions.html", icon: "prescription" },
  ],
  pharmacist: [
    { key: "dashboard",     label: "Dashboard",     href: "/pages/pharmacist/dashboard.html",     icon: "dashboard" },
    { key: "stock",         label: "Stock",         href: "/pages/pharmacist/stock.html",         icon: "stock" },
    { key: "prescriptions", label: "Prescriptions", href: "/pages/pharmacist/prescriptions.html", icon: "prescription" },
  ],
  patient: [
    { key: "dashboard",    label: "Dashboard",         href: "/pages/patient/dashboard.html",         icon: "dashboard" },
    { key: "book",         label: "Appointments",      href: "/pages/patient/book-appointment.html",  icon: "calendarPlus" },
    { key: "prescriptions",label: "Prescriptions",     href: "/pages/patient/prescriptions.html",     icon: "prescription" },
    { key: "history",      label: "Medical History",   href: "/pages/patient/history.html",           icon: "history" },
    { key: "payments",     label: "Payments",          href: "/pages/patient/payments.html",          icon: "payments" },
    { key: "profile",      label: "Profile",           href: "/pages/patient/profile.html",           icon: "user" },
  ],
};

const ROLE_LABEL = { admin: "Admin", doctor: "Doctor", pharmacist: "Pharmacist", patient: "Patient" };

export function renderSidebar(role, activeKey) {
  const items = NAV_BY_ROLE[role] || [];
  const links = items.map(item => `
    <a class="nav-link ${item.key === activeKey ? "active" : ""}" href="${item.href}">
      ${icon(item.icon)}<span>${item.label}</span>
    </a>
  `).join("");

  return `
    <aside class="sidebar" id="appSidebar">
      <div class="sidebar-brand">
        <div class="sidebar-brand-info">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 5v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V5l-8-3z" fill="var(--color-role, var(--color-primary))"/></svg>
          <div>
            <div class="name">FUD HEALTH HMS</div>
            <div class="sub">${ROLE_LABEL[role] || ""} Portal</div>
          </div>
        </div>
        <button class="sidebar-close" id="sidebarCloseBtn" aria-label="Close menu">${icon("close", 18)}</button>
      </div>
      <nav class="nav-group">${links}</nav>
      <nav class="nav-group" style="margin-top:auto;">
        <a class="nav-link" href="#" id="logoutLink">${icon("logout")}<span>Log out</span></a>
      </nav>
    </aside>
  `;
}
