import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { useMyBookings } from "../../hooks/useBookings";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import { transactionAPI } from "../../api/transactionAPI";
import { isUpcomingBooking } from "../../utils/bookingFilters";

export default function CustomerHome() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { data, error } = useMyBookings();

  const { data: transactionResponse } = useQuery({
    queryKey: ["customer-transactions"],
    queryFn: transactionAPI.mine,
  });

  const bookings = Array.isArray(data?.data) ? data.data.filter(Boolean) : [];

  const transactions = Array.isArray(transactionResponse?.data)
    ? transactionResponse.data.filter(Boolean)
    : [];

  const displayName = user?.full_name || user?.name || "Guest";

  const upcomingTrips = bookings.filter((item) =>
    isUpcomingBooking(item)
  ).length;

  const completedStays = bookings.filter(
    (item) => item?.status === "checked_out"
  ).length;

  const pendingPayments = transactions.filter(
    (item) => item?.status === "pending"
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("portal.welcomeEyebrow", "Welcome Back")}
        title={t("portal.welcomeTitle", {
          name: displayName,
          defaultValue: `Namaste, ${displayName} 🙏`,
        })}
        description={t(
          "portal.welcomeDescription",
          "Your Nashik stays, saved rooms, and travel details all live here."
        )}
      />

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load bookings:{" "}
          {error?.response?.data?.error || error.message}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          title={t("portal.upcomingTrips", "Upcoming Trips")}
          value={upcomingTrips}
          accent="saffron"
        />

        <StatCard
          title={t("portal.completedStays", "Completed Stays")}
          value={completedStays}
          accent="vineyard"
        />

        <StatCard
          title={t("portal.pendingPayments", "Pending Payments")}
          value={pendingPayments}
          accent="gold"
        />
      </div>

      <div className="section-card p-6">
        <h2 className="font-heading text-3xl">
          {t("portal.perksTitle", "Return Guest Perks")}
        </h2>

        <p className="mt-3 text-mutedText">
          {t("portal.perksText", {
            name: displayName,
            defaultValue: `Welcome back, ${displayName}! You can rebook past stays, manage ID details, and choose pay-at-hotel on eligible rooms.`,
          })}
        </p>
      </div>
    </div>
  );
}