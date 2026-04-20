import { useEffect, useMemo, useState } from "react";
import Button from "../common/Button";

function formatTime(seconds) {
  const safeSeconds = Math.max(Number(seconds || 0), 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

export default function QrPaymentPanel({
  transaction,
  title = "Scan QR to Pay",
  subtitle = "Complete the payment before the timer ends.",
  onConfirm,
  onRegenerate,
  busy = false,
}) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsRemaining = useMemo(() => {
    const expiry = transaction?.qr_expires_at ? new Date(transaction.qr_expires_at).getTime() : 0;
    return expiry ? Math.max(Math.floor((expiry - now) / 1000), 0) : 0;
  }, [now, transaction?.qr_expires_at]);

  const expired = transaction?.is_expired || secondsRemaining <= 0 || transaction?.status === "expired";

  return (
    <div className="rounded-[28px] border border-divider bg-white p-5">
      <h3 className="font-heading text-2xl">{title}</h3>
      <p className="mt-2 text-sm text-mutedText">{subtitle}</p>

      <div className="mt-4 rounded-2xl bg-saffronLight p-4 text-sm">
        <p className="font-semibold text-vineyard">Amount: INR {transaction?.amount}</p>
        <p className="mt-1 text-mutedText">Status: {transaction?.status}</p>
        <p className="mt-1 text-mutedText">UPI: {transaction?.upi_id || "Not available"}</p>
        <p className={`mt-1 font-semibold ${expired ? "text-red-600" : "text-godavari"}`}>
          Timer: {expired ? "Expired" : formatTime(secondsRemaining)}
        </p>
      </div>

      {!expired && transaction?.qr_image_url ? (
        <div className="mt-5 flex justify-center">
          <img src={transaction.qr_image_url} alt="Payment QR" className="h-60 w-60 rounded-2xl border border-divider bg-white p-3" />
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-600">
          QR is no longer visible because the timer ended.
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button onClick={onConfirm} disabled={busy || expired} className="flex-1">
          {busy ? "Processing..." : "I Have Paid"}
        </Button>
        <Button variant="outline" onClick={onRegenerate} disabled={busy}>
          Generate New QR
        </Button>
      </div>
    </div>
  );
}
