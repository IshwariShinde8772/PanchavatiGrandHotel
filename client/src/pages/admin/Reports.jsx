import { useState } from "react";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import RevenueChart from "../../components/dashboard/RevenueChart";
import OccupancyGrid from "../../components/dashboard/OccupancyGrid";
import { reportAPI } from "../../api/reportAPI";
import { useAdminDashboard } from "../../hooks/useReports";

export default function Reports() {
  const [exporting, setExporting] = useState(false);
  const { data } = useAdminDashboard();

  const handleExport = async () => {
    setExporting(true);
    try {
      await reportAPI.exportCsv();
      toast.success("Bookings CSV downloaded!");
    } catch (e) {
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
        actions={
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 20px",
              borderRadius: 10,
              border: "none",
              background: "#0A4D34",
              color: "white",
              fontWeight: 700,
              fontSize: 14,
              cursor: exporting ? "not-allowed" : "pointer",
              opacity: exporting ? 0.7 : 1,
              transition: "opacity 0.2s",
            }}
          >
            {exporting ? (
              <>⏳ Exporting…</>
            ) : (
              <>⬇ Export CSV</>
            )}
          </button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <RevenueChart data={data?.revenueSeries || []} />
        <OccupancyGrid occupancy={data?.occupancy || {}} />
      </div>
    </div>
  );
}
