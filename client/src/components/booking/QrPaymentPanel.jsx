import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../common/Button";

function formatTime(seconds) {
  const safeSeconds = Math.max(Number(seconds || 0), 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function buildFallbackQrImage(transaction) {
  const label = transaction?.booking_ref || transaction?.payment_reference || "TEST";
  const amount = transaction?.amount ? `INR ${transaction.amount}` : "INR --";
  const payload = transaction?.qr_payload || "upi://pay";
  const escapedPayload = String(payload).slice(0, 42).replace(/[<>&"]/g, "");
  const escapedLabel = String(label).replace(/[<>&"]/g, "");
  const escapedAmount = String(amount).replace(/[<>&"]/g, "");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="280" height="280" viewBox="0 0 280 280">
      <rect width="280" height="280" fill="#ffffff"/>
      <rect x="20" y="20" width="240" height="240" fill="#f8fafc" stroke="#0A4D34" stroke-width="2"/>
      <rect x="44" y="44" width="52" height="52" fill="#0A4D34"/>
      <rect x="184" y="44" width="52" height="52" fill="#0A4D34"/>
      <rect x="44" y="184" width="52" height="52" fill="#0A4D34"/>
      <rect x="116" y="116" width="48" height="48" fill="#C8440A"/>
      <text x="140" y="198" text-anchor="middle" font-size="11" fill="#0A4D34" font-family="Arial, sans-serif">TEST QR</text>
      <text x="140" y="214" text-anchor="middle" font-size="11" fill="#0A4D34" font-family="Arial, sans-serif">${escapedAmount}</text>
      <text x="140" y="230" text-anchor="middle" font-size="10" fill="#526359" font-family="Arial, sans-serif">${escapedLabel}</text>
      <text x="140" y="246" text-anchor="middle" font-size="8" fill="#526359" font-family="Arial, sans-serif">${escapedPayload}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
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
  const { t } = useTranslation();
  const displayTitle = title === "Scan QR to Pay" ? t("payment.scanQr") : title;
  const displaySubtitle = subtitle === "Complete the payment before the timer ends." ? t("payment.completeBeforeTimer") : subtitle;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const secondsRemaining = useMemo(() => {
    const expiry = transaction?.qr_expires_at ? new Date(transaction.qr_expires_at).getTime() : 0;
    return expiry ? Math.max(Math.floor((expiry - now) / 1000), 0) : 0;
  }, [now, transaction?.qr_expires_at]);

  const expired = transaction?.is_expired || secondsRemaining <= 0 || transaction?.status === "expired";
  const qrImage = transaction?.qr_image_url || buildFallbackQrImage(transaction);

  return (
    <div className="rounded-[28px] border border-divider bg-white p-5">
      <h3 className="font-heading text-2xl">{displayTitle}</h3>
      <p className="mt-2 text-sm text-mutedText">{displaySubtitle}</p>

      <div className="mt-4 rounded-2xl bg-saffronLight p-4 text-sm">
        <p className="font-semibold text-vineyard">{t("payment.amount", { amount: transaction?.amount })}</p>
        <p className="mt-1 text-mutedText">{t("payment.status", { status: transaction?.status })}</p>
        <p className="mt-1 text-mutedText">{t("payment.upi", { upi: transaction?.upi_id || t("payment.notAvailable") })}</p>
        <p className={`mt-1 font-semibold ${expired ? "text-red-600" : "text-godavari"}`}>
          {t("payment.timer", { value: expired ? t("payment.expired") : formatTime(secondsRemaining) })}
        </p>
      </div>

      {!expired ? (
        <div className="mt-5 flex justify-center">
          <img src={qrImage} alt="Payment QR" className="h-60 w-60 rounded-2xl border border-divider bg-white p-3" />
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
