import Button from "../common/Button";
import { useTranslation } from "react-i18next";

export default function PostponePaymentOption({ onReserve, busy = false, totalAmount = 0, advanceAmount }) {
  const { t } = useTranslation();
  const advance = Number(advanceAmount ?? Number(totalAmount || 0) * 0.1);
  return (
    <div className="rounded-[28px] border-2 border-saffron bg-saffronLight p-5">
      <h3 className="font-heading text-2xl">{t("bookingUi.reserveAdvance")}</h3>
      <ul className="mt-4 space-y-2 text-sm text-mutedText">
        <li>{t("shared.totalAmount")}: INR {Number(totalAmount || 0).toFixed(2)}</li>
        <li>{t("bookingUi.advancePayable")}: INR {advance.toFixed(2)}</li>
        <li>{t("bookingUi.remainingAtHotel")}: INR {Math.max(Number(totalAmount || 0) - advance, 0).toFixed(2)}</li>
        <li>{t("bookingUi.cancellationPolicyShort")}</li>
      </ul>
      <Button variant="gold" className="mt-5 w-full" onClick={onReserve} disabled={busy}>
        {busy ? t("shared.processing") : t("bookingUi.payAndReserve")}
      </Button>
    </div>
  );
}

