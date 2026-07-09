import { useNavigate } from "react-router-dom";
import { LogIn, LogOut, BedDouble, PlusCircle, FileText } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import Button from "../../components/common/Button";
import { useReceptionistDashboard } from "../../hooks/useReports";
import { useTranslation } from "react-i18next";
import { bookingStatusLabel, roomCategoryLabel } from "../../utils/i18nLabels";

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useReceptionistDashboard();
  const stats = data?.stats || {};
  const recentBookings = data?.recentBookings || [];

  return (
    <div className="space-y-8 pb-10">
      <PageHeader 
        eyebrow={t("reception.dashboardEyebrow")}
        title={t("reception.dashboardTitle")}
        description={t("reception.dashboardDescription")}
      />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <StatCard 
          title={t("reception.todayCheckIns")}
          value={stats.check_ins_today || 0} 
          icon={LogIn}
          accent="gold" 
        />
        <StatCard 
          title={t("reception.todayCheckOuts")}
          value={stats.check_outs_today || 0} 
          icon={LogOut}
          accent="saffron" 
        />
        <StatCard 
          title={t("reception.currentlyOccupied")}
          value={stats.occupied_rooms || 0} 
          icon={BedDouble}
          accent="godavari" 
        />
      </div>

      <div className="flex flex-wrap gap-4">
        <Button 
          onClick={() => navigate("/receptionist/walk-in")} 
          className="flex items-center gap-2 bg-saffron text-white border-none px-8 py-3 h-auto"
        >
          <PlusCircle size={18} /> {t("layout.walkInBooking")}
        </Button>
        <Button 
          variant="outline"
          onClick={() => navigate("/receptionist/bill-generator")} 
          className="flex items-center gap-2 border-godavari text-godavari px-8 py-3 h-auto"
        >
          <FileText size={18} /> {t("reception.generateBill")}
        </Button>
      </div>

      <div className="section-card overflow-hidden">
        <div className="border-b border-divider px-6 py-4 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-heading text-xl font-bold text-vineyard">{t("reception.recentBookings")}</h3>
          <button 
            onClick={() => navigate("/receptionist/bookings")}
            className="text-sm font-bold text-saffron hover:underline"
          >
            {t("reception.viewAll")}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-[#0A4D34]/5 text-vineyard font-bold text-xs uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">{t("exports.guest")}</th>
                <th className="px-6 py-4">{t("common.room")}</th>
                <th className="px-6 py-4">{t("customer.checkIn")}</th>
                <th className="px-6 py-4">{t("customer.checkOut")}</th>
                <th className="px-6 py-4">{t("common.status")}</th>
                <th className="px-6 py-4 text-right">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider">
              {isLoading ? (
                <tr><td colSpan="6" className="p-10 text-center text-mutedText">{t("common.loading")}</td></tr>
              ) : recentBookings.map((b) => (
                <tr key={b.id} className="hover:bg-divider/20 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-vineyard">{b.customer?.full_name}</p>
                    <p className="text-[10px] text-mutedText">{b.customer?.phone}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-semibold">{b.room?.room_number}</p>
                    <p className="text-[10px] text-mutedText uppercase">{roomCategoryLabel(t, b.room?.category)}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-mutedText">{b.check_in}</td>
                  <td className="px-6 py-4 text-sm text-mutedText">{b.check_out}</td>
                  <td className="px-6 py-4 text-[10px] font-bold uppercase">
                    <span className={`px-2 py-0.5 rounded-full ${
                       b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                       b.status === 'checked_in' ? 'bg-blue-100 text-blue-700' :
                       'bg-gray-100 text-gray-700'
                    }`}>
                      {bookingStatusLabel(t, b)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => navigate(`/receptionist/bookings?ref=${b.booking_ref}`)}
                      className="text-xs font-bold text-saffron hover:underline"
                    >
                      {t("reception.manage")}
                    </button>
                  </td>
                </tr>
              ))}
              {recentBookings.length === 0 && !isLoading && (
                 <tr><td colSpan="6" className="p-10 text-center text-mutedText">{t("reception.noRecentActivity")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
