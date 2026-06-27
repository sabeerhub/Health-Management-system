// ==========================================================================
// FUD HEALTH HMS — FORGOT PASSWORD FLOW
// Wires a "Forgot password?" link to a real Supabase resetPasswordForEmail()
// call, shared by all 4 login pages (patient + 3 hidden staff logins).
// ==========================================================================

import { openModal, closeModal } from "./modal.js?v2";
import { requestPasswordReset } from "/assets/js/auth.js?v2";
import { showToast } from "/assets/js/toast.js?v2";

export function wireForgotPassword(linkId) {
  const link = document.getElementById(linkId);
  if (!link) return;

  link.addEventListener("click", (e) => {
    e.preventDefault();
    openModal(`
      <h3>Reset your password</h3>
      <p style="color:var(--color-gray-500); margin: var(--space-3) 0 var(--space-4); font-size: var(--fs-sm);">
        Enter your account email and we'll send a secure link to set a new password.
      </p>
      <form id="resetForm">
        <div class="field"><label>Email address</label><input class="input" type="email" id="resetEmail" required></div>
        <div style="display:flex; gap:var(--space-3); justify-content:flex-end;">
          <button type="button" class="btn btn-secondary" id="resetCancel">Cancel</button>
          <button type="submit" class="btn btn-primary" id="resetSubmit">Send reset link</button>
        </div>
      </form>
    `);

    document.getElementById("resetCancel").addEventListener("click", closeModal);
    document.getElementById("resetForm").addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const btn = document.getElementById("resetSubmit");
      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        await requestPasswordReset(document.getElementById("resetEmail").value.trim());
        // Deliberately neutral wording either way — never confirm or deny
        // whether an account exists for that email (avoids enumeration).
        showToast("If that email exists, a reset link is on its way.", "success", 6000);
        closeModal();
      } catch (err) {
        showToast(err.message || "Could not send reset link.", "error");
        btn.disabled = false;
        btn.textContent = "Send reset link";
      }
    });
  });
}
