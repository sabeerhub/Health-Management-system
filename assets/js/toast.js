// ==========================================================================
// FUD HEALTH HMS — TOAST UTILITY
// ==========================================================================

function ensureStack() {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.className = "toast-stack";
    document.body.appendChild(stack);
  }
  return stack;
}

/**
 * showToast("Account created", "success")
 * types: "success" | "error" | "info" (default)
 */
export function showToast(message, type = "info", duration = 4000) {
  const stack = ensureStack();
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.setAttribute("role", "status");
  stack.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 200ms ease";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 200);
  }, duration);
}
