import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import { couponAPI } from "../../api/couponAPI";
import { formatCurrency } from "../../utils/formatCurrency";

export default function CouponDetails() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: response, isLoading } = useQuery({
    queryKey: ["admin-coupon", id],
    queryFn: () => couponAPI.detail(id),
  });
  const details = response?.data;
  const coupon = details?.coupon;
  const analytics = details?.analytics;
  const usages = details?.usages || [];

  if (isLoading) return <p className="p-6 text-mutedText">{t("ops.loadingCouponAnalytics")}</p>;
  if (!coupon) return <p className="p-6 text-mutedText">{t("ops.couponNotFound")}</p>;

  const cards = [
    ["Times Used", analytics.total_times_used],
    ["Discount Given", formatCurrency(analytics.total_discount_given)],
    ["Successful Bookings", analytics.successful_bookings],
    ["Cancelled / Refunded", analytics.cancelled_bookings],
    ["Revenue After Coupon", formatCurrency(analytics.revenue_generated)],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={`Coupon ${coupon.code}`}
        title={coupon.title}
        description={coupon.description || t("ops.couponAnalytics")}
        actions={<Button variant="outline" onClick={() => navigate("/admin/coupons")}>{t("ops.backToCoupons")}</Button>}
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map(([label, value]) => (
          <div className="section-card p-5" key={label}>
            <p className="text-xs font-bold uppercase tracking-wider text-mutedText">{label}</p>
            <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
          </div>
        ))}
      </div>
      <div className="section-card overflow-x-auto">
        <div className="border-b border-divider p-5">
          <h2 className="font-heading text-2xl">{t("ops.customerUsage")}</h2>
        </div>
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-saffronLight/40 text-xs uppercase tracking-wider text-mutedText">
            <tr>
              {["Customer", "Booking", "Room", "Discount", "Final Amount", "Used At", "Payment", "Booking Status"].map((heading) => (
                <th className="px-4 py-3" key={heading}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {usages.map((usage) => (
              <tr className="border-b border-divider" key={usage.id}>
                <td className="px-4 py-4">
                  <p className="font-semibold">{usage.customer?.full_name || `Customer #${usage.customer_id}`}</p>
                  <p className="text-xs text-mutedText">{usage.customer?.email || usage.customer?.phone}</p>
                </td>
                <td className="px-4 py-4">{usage.booking?.booking_ref || "Deleted booking"}</td>
                <td className="px-4 py-4">{usage.booking?.room?.room_number || "—"}</td>
                <td className="px-4 py-4">{formatCurrency(usage.discount_amount)}</td>
                <td className="px-4 py-4">{formatCurrency(usage.final_amount_after_coupon)}</td>
                <td className="px-4 py-4">{new Date(usage.used_at).toLocaleString()}</td>
                <td className="px-4 py-4 capitalize">{usage.payment_status}</td>
                <td className="px-4 py-4 capitalize">{usage.booking_status}</td>
              </tr>
            ))}
            {!usages.length ? (
              <tr><td className="px-6 py-12 text-center text-mutedText" colSpan="8">{t("ops.couponUnused")}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
