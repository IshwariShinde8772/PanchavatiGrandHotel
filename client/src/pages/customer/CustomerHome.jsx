import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useMyBookings } from "../../hooks/useBookings";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import { transactionAPI } from "../../api/transactionAPI";

export default function CustomerHome() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { data } = useMyBookings();
  const { data: transactionResponse } = useQuery({
    queryKey: ["customer-transactions"],
    queryFn: transactionAPI.mine,
  });
  const bookings = data?.data || [];
  const transactions = transactionResponse?.data || [];
  const displayName = user?.full_name || user?.name || "Guest";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("portal.welcomeEyebrow")}
        title={t("portal.welcomeTitle", { name: displayName })}
        description={t("portal.welcomeDescription")}
      />
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard title={t("portal.upcomingTrips")} value={bookings.filter((item) => item.status === "confirmed").length} accent="saffron" />
        <StatCard title={t("portal.completedStays")} value={bookings.filter((item) => item.status === "checked_out").length} accent="vineyard" />
        <StatCard title={t("portal.pendingPayments")} value={transactions.filter((item) => item.status === "pending").length} accent="gold" />
      </div>
      <div className="section-card p-6">
        <h2 className="font-heading text-3xl">{t("portal.perksTitle")}</h2>
        <p className="mt-3 text-mutedText">{t("portal.perksText", { name: user?.full_name || "Guest" })}</p>
      </div>
    </div>
  );
}
