import { format, parseISO } from "date-fns";
import { formatCurrency } from "../../utils/formatCurrency";
import { useTranslation } from "react-i18next";

export default function AvailabilityCalendar({ days = [] }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 rounded-[28px] border border-divider bg-white p-5 md:grid-cols-2">
      {days.map((day) => {
        const occupied = day.status === "occupied" || day.available === false;
        const offerRate = !occupied && day.rateType === "offer";

        return (
          <div
            key={day.date}
            className={`rounded-2xl border p-4 transition-all ${
              occupied
                ? "border-divider bg-gray-50 opacity-60"
                : offerRate
                  ? "border-gold bg-goldLight/30"
                  : "border-divider/70 bg-white hover:border-saffron"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-vineyard">{format(parseISO(day.date), "EEE, dd MMM")}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-mutedText">
                  {occupied ? t("statuses.room.occupied") : offerRate ? t("bookingUi.offerRate") : t("bookingUi.standardRate")}
                </p>
              </div>
              {!occupied ? (
                <div className="text-right">
                  {offerRate && Number(day.basePrice) > Number(day.price) ? (
                    <p className="text-xs text-mutedText line-through">{formatCurrency(day.basePrice)}</p>
                  ) : null}
                  <p className="text-sm font-black text-saffron">{formatCurrency(day.price)}</p>
                </div>
              ) : null}
            </div>
            {occupied ? (
              <p className="mt-2 inline-block rounded-full bg-maroon/10 px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-maroon">
                {t("bookingUi.bookedReserved")}
              </p>
            ) : (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-tight text-success">
                {t("statuses.room.available")}
                {offerRate && day.discountPct ? ` · ${Number(day.discountPct)}% off` : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
