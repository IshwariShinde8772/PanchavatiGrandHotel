import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import RevenueChart from "../../components/dashboard/RevenueChart";
import OccupancyGrid from "../../components/dashboard/OccupancyGrid";
import RecentBookingsTable from "../../components/dashboard/RecentBookingsTable";
import AlertsPanel from "../../components/dashboard/AlertsPanel";
import { useAdminDashboard } from "../../hooks/useReports";

export default function Dashboard() {
  const { data } = useAdminDashboard();

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin Dashboard" title="Operational and revenue overview" description="Track bookings, occupancy, enquiries, maintenance, and team performance from one place." />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <StatCard title="Revenue This Month" value={`₹${data?.stats?.total_revenue || 0}`} accent="saffron" />
        <StatCard title="Total Bookings" value={data?.stats?.total_bookings || 0} accent="gold" />
        <StatCard title="Occupancy Rate" value={`${data?.stats?.occupancy_rate || 0}%`} accent="vineyard" />
        <StatCard title="Active Staff" value={data?.stats?.active_staff || 0} accent="godavari" />
        <StatCard title="Open Maintenance" value={data?.stats?.open_maintenance || 0} accent="maroon" />
        <StatCard title="New Enquiries" value={data?.stats?.new_enquiries || 0} accent="gold" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <RevenueChart data={data?.revenueSeries || []} />
        <OccupancyGrid occupancy={data?.occupancy || {}} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <RecentBookingsTable rows={data?.recentBookings || []} />
        <AlertsPanel alerts={data?.alerts || {}} />
      </div>
    </div>
  );
}

