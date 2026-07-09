import { formatCurrency } from "../../utils/formatCurrency";
import { useTranslation } from "react-i18next";
import { bookingStatusLabel } from "../../utils/i18nLabels";

export default function RecentBookingsTable({ rows = [] }) {
  const { t } = useTranslation();
  return (
    <div className="section-card overflow-hidden">
      <div className="border-b border-divider px-5 py-4">
        <h3 className="font-heading text-2xl">{t("admin.recentBookings")}</h3>
      </div>
      <div className="divide-y divide-divider">
        {rows.map((booking) => (
          <div key={booking.id} className="grid gap-2 px-5 py-4 md:grid-cols-5">
            <div>
              <p className="font-semibold">{booking.booking_ref || "Pending Ref"}</p>
              <p className="text-sm text-mutedText">{bookingStatusLabel(t, booking)}</p>
            </div>
            <p>{booking.customer?.full_name || booking.customer_id || t("exports.guest")}</p>
            <p>{booking.room?.room_number || booking.room_id}</p>
            <p>{booking.check_in}</p>
            <p className="font-semibold text-saffron">{formatCurrency(booking.total_amount || 0)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

