// ==========================================================================
// FUD HEALTH HMS — KORAPAY CHECKOUT HELPER
// Loads Korapay's real Inline Checkout script and opens the popup.
// Docs: https://developers.korapay.com/docs/checkout-standard
// ==========================================================================

import { KORAPAY_PUBLIC_KEY, SUPABASE_URL } from "./config.js?v2";

let scriptLoaded = false;

function loadKorapayScript() {
  return new Promise((resolve, reject) => {
    if (scriptLoaded && window.Korapay) return resolve();
    const script = document.createElement("script");
    script.src = "https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js";
    script.onload = () => { scriptLoaded = true; resolve(); };
    script.onerror = () => reject(new Error("Could not load Korapay checkout script."));
    document.body.appendChild(script);
  });
}

/**
 * openKorapayCheckout({ amount, reference, customer: {name, email}, onSuccess, onFailed, onClose })
 * amount is in NGN (whole naira) — Korapay's inline widget expects the
 * naira amount directly (not kobo) for Checkout Standard.
 */
export async function openKorapayCheckout({ amount, reference, customer, onSuccess, onFailed, onClose }) {
  await loadKorapayScript();
  if (!window.Korapay) throw new Error("Korapay script did not initialize.");

  window.Korapay.initialize({
    key: KORAPAY_PUBLIC_KEY,
    reference,
    amount,
    currency: "NGN",
    customer,
    // Per-transaction webhook destination — works independently of whatever
    // the Korapay account's global "Settings > API Configuration" webhook
    // URL is set to, so this is safe even on a Korapay account shared with
    // other unrelated projects.
    notification_url: `${SUPABASE_URL}/functions/v1/korapay-webhook`,
    onClose: () => { if (onClose) onClose(); },
    onSuccess: (data) => { if (onSuccess) onSuccess(data); },
    onFailed: (data) => { if (onFailed) onFailed(data); },
  });
}

export function generatePaymentReference(prefix = "FUD") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
