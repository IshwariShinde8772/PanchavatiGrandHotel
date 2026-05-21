import { useTranslation } from "react-i18next";
import { formatCurrency } from "../../utils/formatCurrency";
import { calcGST } from "../../utils/calcGST";

export default function PriceBreakdown({ pricePerNight, nights, gstPercent = 12, discount = 0 }) {
  const { t } = useTranslation();
  const subtotal = pricePerNight * nights - discount;
  const gst = calcGST(subtotal, gstPercent);

  return (
    <div className="rounded-[24px] bg-goldLight p-4 text-sm">
      <div className="flex items-center justify-between"><span>{t("room.baseFare")}</span><span>{formatCurrency(pricePerNight)} x {nights}</span></div>
      {discount ? <div className="mt-2 flex items-center justify-between text-success"><span>{t("room.discount")}</span><span>-{formatCurrency(discount)}</span></div> : null}
      <div className="mt-2 flex items-center justify-between"><span>{t("room.subtotal")}</span><span>{formatCurrency(subtotal)}</span></div>
      <div className="mt-2 flex items-center justify-between"><span>GST ({gstPercent}%)</span><span>{formatCurrency(gst.gstAmount)}</span></div>
      <div className="mt-3 border-t border-divider pt-3 text-base font-semibold">
        <div className="flex items-center justify-between"><span>{t("room.total")}</span><span>{formatCurrency(gst.totalAmount)}</span></div>
      </div>
    </div>
  );
}
