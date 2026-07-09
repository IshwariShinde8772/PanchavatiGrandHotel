import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import RevenueChart from "../../components/dashboard/RevenueChart";
import OccupancyGrid from "../../components/dashboard/OccupancyGrid";
import RecentBookingsTable from "../../components/dashboard/RecentBookingsTable";
import AlertsPanel from "../../components/dashboard/AlertsPanel";
import { useAdminDashboard } from "../../hooks/useReports";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t } = useTranslation();
  const { data } = useAdminDashboard();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("admin.dashboardEyebrow")} title={t("admin.dashboardTitle")} description={t("admin.dashboardDescription")} />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title={t("admin.revenueThisMonth")} value={`₹${data?.stats?.total_revenue || 0}`} accent="saffron" />
        <StatCard title={t("admin.totalBookings")} value={data?.stats?.total_bookings || 0} accent="gold" />
        <StatCard title={t("admin.occupancyRate")} value={`${data?.stats?.occupancy_rate || 0}%`} accent="vineyard" />
        <StatCard title={t("admin.activeStaff")} value={data?.stats?.active_staff || 0} accent="godavari" />
        <StatCard title={t("admin.openMaintenance")} value={data?.stats?.open_maintenance || 0} accent="maroon" />
        <StatCard title={t("admin.newEnquiries")} value={data?.stats?.new_enquiries || 0} accent="gold" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <RevenueChart data={data?.revenueSeries || []} />
        <OccupancyGrid occupancy={data?.occupancy || {}} />
      </div>
      <div className="section-card p-6">
        <h3 className="font-heading text-xl">{t("admin.manualOnlineBookings")}</h3>
        {data?.bookingMix?.total ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              [t("admin.manualBookings"), data.bookingMix.manual, "bg-saffron"],
              [t("admin.onlineBookings"), data.bookingMix.online, "bg-godavari"],
            ].map(([label, count, color]) => (
              <div key={label} className="rounded-xl border border-divider p-4">
                <div className="flex justify-between"><span className="font-semibold">{label}</span><strong>{count}</strong></div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full ${color}`} style={{ width: `${(count / data.bookingMix.total) * 100}%` }} />
                </div>
                <p className="mt-2 text-xs text-mutedText">{t("admin.thisMonth", { value: Math.round((count / data.bookingMix.total) * 100) })}</p>
              </div>
            ))}
          </div>
        ) : <p className="mt-4 text-sm text-mutedText">{t("admin.noBookingsPeriod")}</p>}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <RecentBookingsTable rows={data?.recentBookings || []} />
        <AlertsPanel alerts={data?.alerts || {}} />
      </div>
    </div>
  );
}

