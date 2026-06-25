// ==========================================================================
// FUD HEALTH HMS — RECEIPT GENERATOR
// Opens a clean, print-ready receipt in a new window/tab. The user's
// browser "Print → Save as PDF" produces a real downloadable receipt —
// no external PDF library needed, and it works offline.
// ==========================================================================

export function openReceipt(payment, patientName) {
  const win = window.open("", "_blank", "width=480,height=640");
  if (!win) {
    alert("Please allow pop-ups to view the receipt.");
    return;
  }

  const date = new Date(payment.created_at).toLocaleString("en-NG", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Receipt — ${payment.korapay_reference}</title>
      <style>
        body { font-family: -apple-system, "Inter", sans-serif; padding: 32px; color: #111827; }
        .receipt { max-width: 380px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 20px; padding: 28px; }
        .brand { display:flex; align-items:center; gap:10px; margin-bottom: 20px; }
        .brand .name { font-weight: 700; font-size: 14px; }
        .brand .sub { font-size: 11px; color: #6B7280; }
        h2 { font-size: 18px; margin: 0 0 4px; }
        .status { display:inline-block; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight:600; margin-bottom: 20px; }
        .status.success { background:#D7F7E9; color:#047857; }
        .status.pending { background:#FEF1D6; color:#B45309; }
        .status.failed  { background:#FDE8E8; color:#B91C1C; }
        .row { display:flex; justify-content:space-between; padding: 10px 0; border-bottom: 1px dashed #E5E7EB; font-size: 13px; }
        .row span:first-child { color: #6B7280; }
        .total { display:flex; justify-content:space-between; padding-top: 16px; font-weight: 700; font-size: 16px; }
        .footer { text-align:center; margin-top: 24px; font-size: 11px; color: #9CA3AF; }
        @media print { body { padding: 0; } .receipt { border: none; } }
      </style>
    </head>
    <body onload="window.print()">
      <div class="receipt">
        <div class="brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2L4 5v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V5l-8-3z" fill="#2563EB"/></svg>
          <div><div class="name">FUD HEALTH HMS</div><div class="sub">Federal University Dutse Health Centre</div></div>
        </div>
        <h2>Payment Receipt</h2>
        <span class="status ${payment.status}">${payment.status.toUpperCase()}</span>
        <div class="row"><span>Reference</span><span>${payment.korapay_reference || "—"}</span></div>
        <div class="row"><span>Patient</span><span>${patientName || "—"}</span></div>
        <div class="row"><span>Date</span><span>${date}</span></div>
        <div class="row"><span>Currency</span><span>${payment.currency}</span></div>
        <div class="total"><span>Amount</span><span>₦${Number(payment.amount).toLocaleString()}</span></div>
        <div class="footer">This receipt was generated automatically by FUD Health HMS.</div>
      </div>
    </body>
    </html>
  `);
  win.document.close();
}
