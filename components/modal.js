// ==========================================================================
// FUD HEALTH HMS — MODAL COMPONENT
// ==========================================================================

export function openModal(innerHTML) {
  closeModal();
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.id = "activeModalOverlay";
  overlay.innerHTML = `<div class="modal">${innerHTML}</div>`;
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
  document.body.appendChild(overlay);
  return overlay;
}

export function closeModal() {
  const existing = document.getElementById("activeModalOverlay");
  if (existing) existing.remove();
}

/**
 * confirmAction({ title, message, confirmText, danger }) -> Promise<boolean>
 * Use for destructive actions: delete staff, remove medicine, cancel appointment.
 */
export function confirmAction({ title = "Are you sure?", message = "", confirmText = "Confirm", danger = true }) {
  return new Promise((resolve) => {
    const overlay = openModal(`
      <h3>${title}</h3>
      <p style="margin: var(--space-3) 0 var(--space-5); color: var(--color-gray-500);">${message}</p>
      <div style="display:flex; gap: var(--space-3); justify-content:flex-end;">
        <button class="btn btn-secondary" id="modalCancelBtn">Cancel</button>
        <button class="btn ${danger ? "btn-danger" : "btn-primary"}" id="modalConfirmBtn">${confirmText}</button>
      </div>
    `);
    overlay.querySelector("#modalCancelBtn").addEventListener("click", () => { closeModal(); resolve(false); });
    overlay.querySelector("#modalConfirmBtn").addEventListener("click", () => { closeModal(); resolve(true); });
  });
}
