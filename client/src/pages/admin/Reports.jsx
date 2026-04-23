import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import RevenueChart from "../../components/dashboard/RevenueChart";
import OccupancyGrid from "../../components/dashboard/OccupancyGrid";
import SelectField from "../../components/forms/SelectField";
import InputField from "../../components/forms/InputField";
import Button from "../../components/common/Button";
import { formatCurrency } from "../../utils/formatCurrency";
import { reportAPI } from "../../api/reportAPI";
import { useAdminReport } from "../../hooks/useReports";

const currentDate = new Date();

const monthOptions = [
  { label: "January", value: "1" },
  { label: "February", value: "2" },
  { label: "March", value: "3" },
  { label: "April", value: "4" },
  { label: "May", value: "5" },
  { label: "June", value: "6" },
  { label: "July", value: "7" },
  { label: "August", value: "8" },
  { label: "September", value: "9" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
];

const yearOptions = Array.from({ length: 7 }).map((_, index) => {
  const year = String(currentDate.getUTCFullYear() - 3 + index);
  return { label: year, value: year };
});

const categoryOptions = [
  { label: "All categories", value: "" },
  { label: "Standard", value: "Standard" },
  { label: "Deluxe", value: "Deluxe" },
  { label: "Suite", value: "Suite" },
  { label: "Family", value: "Family" },
  { label: "Presidential", value: "Presidential" },
];

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Checked In", value: "checked_in" },
  { label: "Checked Out", value: "checked_out" },
  { label: "Cancelled", value: "cancelled" },
];

function cleanFilters(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null)
  );
}

export default function Reports() {
  const [exporting, setExporting] = useState(false);
  const [filters, setFilters] = useState({
    year: String(currentDate.getUTCFullYear()),
    month: String(currentDate.getUTCMonth() + 1),
    dateFrom: "",
    dateTo: "",
    category: "",
    status: "",
  });

  const queryFilters = useMemo(() => cleanFilters(filters), [filters]);
  const { data, isLoading } = useAdminReport(queryFilters);

  const summary = data?.summary || {};
  const revenueSeries = (data?.revenueSeries || []).map((entry) => ({
    month: entry.period,
    revenue: entry.revenue,
    bookings: entry.bookings,
  }));

  const handleExport = async () => {
    setExporting(true);
    try {
      await reportAPI.exportCsv(queryFilters);
      toast.success("Filtered bookings CSV downloaded");
    } catch (error) {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Monthly performance reporting"
        description="Revenue, occupancy, category trends, and export-friendly management summaries."
        actions={(
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : "Export CSV"}
          </Button>
        )}
      />

      <div className="section-card p-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SelectField
          label="Year"
          value={filters.year}
          onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}
          options={yearOptions}
        />
        <SelectField
          label="Month"
          value={filters.month}
          onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}
          options={monthOptions}
        />
        <SelectField
          label="Category"
          value={filters.category}
          onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
          options={categoryOptions}
        />
        <SelectField
          label="Booking Status"
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          options={statusOptions}
        />
        <InputField
          label="Date From (optional)"
          type="date"
          value={filters.dateFrom}
          onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
        />
        <InputField
          label="Date To (optional)"
          type="date"
          value={filters.dateTo}
          onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
        />
      </div>

      {isLoading ? (
        <div className="section-card p-6 text-sm text-mutedText">Loading report...</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="section-card p-5">
              <p className="text-sm text-mutedText">Total Revenue</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.total_revenue || 0)}</p>
            </div>
            <div className="section-card p-5">
              <p className="text-sm text-mutedText">Total Bookings</p>
              <p className="mt-2 text-2xl font-semibold">{summary.total_bookings || 0}</p>
            </div>
            <div className="section-card p-5">
              <p className="text-sm text-mutedText">Occupancy Rate</p>
              <p className="mt-2 text-2xl font-semibold">{summary.occupancy_rate || 0}%</p>
            </div>
            <div className="section-card p-5">
              <p className="text-sm text-mutedText">GST Collected</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.gst_collected || 0)}</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <RevenueChart data={revenueSeries} />
            <OccupancyGrid occupancy={data?.occupancy || {}} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="section-card p-5">
              <h3 className="font-heading text-2xl">Revenue By Category</h3>
              <div className="mt-4 divide-y divide-divider">
                {(data?.revenueByCategory || []).map((item) => (
                  <div key={item.category} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{item.category}</p>
                      <p className="text-xs text-mutedText">{item.bookings} bookings</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.revenue)}</p>
                  </div>
                ))}
                {(data?.revenueByCategory || []).length === 0 ? (
                  <p className="py-3 text-sm text-mutedText">No category revenue data for selected filters.</p>
                ) : null}
              </div>
            </div>

            <div className="section-card p-5">
              <h3 className="font-heading text-2xl">Bookings By Status</h3>
              <div className="mt-4 divide-y divide-divider">
                {(data?.bookingsByStatus || []).map((item) => (
                  <div key={item.status} className="py-3 flex items-center justify-between">
                    <p className="font-semibold capitalize">{String(item.status).replace(/_/g, " ")}</p>
                    <p className="font-semibold">{item.count}</p>
                  </div>
                ))}
                {(data?.bookingsByStatus || []).length === 0 ? (
                  <p className="py-3 text-sm text-mutedText">No booking status data for selected filters.</p>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

