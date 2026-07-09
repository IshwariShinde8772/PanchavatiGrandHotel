import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import RevenueChart from "../../components/dashboard/RevenueChart";
import OccupancyGrid from "../../components/dashboard/OccupancyGrid";
import SelectField from "../../components/forms/SelectField";
import InputField from "../../components/forms/InputField";
import Button from "../../components/common/Button";
import { formatCurrency } from "../../utils/formatCurrency";
import { useAdminReport } from "../../hooks/useReports";
import { exportTableExcel, exportTablePdf } from "../../utils/exportReports";
import { bookingStatusLabel, roomCategoryLabel } from "../../utils/i18nLabels";

const currentDate = new Date();

const yearOptions = Array.from({ length: 7 }).map((_, index) => {
  const year = String(currentDate.getUTCFullYear() - 3 + index);
  return { label: year, value: year };
});

function cleanFilters(filters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value !== undefined && value !== null)
  );
}

export default function Reports() {
  const { t, i18n } = useTranslation();
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    label: new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, { month: "long" }).format(new Date(2026, index, 1)),
    value: String(index + 1),
  }));
  const categoryOptions = [
    { label: t("room.allCategories"), value: "" },
    ...["Standard", "Deluxe", "Regular"].map((value) => ({ label: roomCategoryLabel(t, value), value })),
  ];
  const statusOptions = [
    { label: t("shared.allStatuses"), value: "" },
    ...["pending", "confirmed", "checked_in", "checked_out", "cancelled"].map((value) => ({
      label: bookingStatusLabel(t, { status: value }),
      value,
    })),
  ];
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

  const reportRows = data?.bookings || [];

  const exportColumns = [
    { header: t("shared.bookingId"), value: (row) => row.booking_ref || row.booking_id },
    { header: t("shared.customer"), value: (row) => row.customer_name },
    { header: t("common.room"), value: (row) => `${row.room_number} ${roomCategoryLabel(t, row.category)}`.trim() },
    { header: t("exports.checkInDate"), value: (row) => row.check_in_date },
    { header: t("exports.actualCheckInIst"), value: (row) => row.actual_check_in_ist },
    { header: t("exports.originalCheckout"), value: (row) => row.original_checkout_date },
    { header: t("exports.actualCheckoutIst"), value: (row) => row.actual_checkout_ist },
    { header: t("exports.earlyCheckout"), value: (row) => row.early_checkout },
    { header: t("exports.earlyCheckoutReason"), value: (row) => row.early_checkout_reason },
    { header: t("exports.checkedOutBy"), value: (row) => row.checked_out_by },
    { header: t("exports.roomStatusAfterCheckout"), value: (row) => row.room_status_after_checkout },
    { header: t("shared.totalAmount"), value: (row) => row.total_amount },
    { header: t("shared.paidAmount"), value: (row) => row.paid_amount },
    { header: t("shared.remainingAmount"), value: (row) => row.remaining_amount },
    { header: "Extension Amount", value: (row) => row.extension_amount },
    { header: "Extension Payment Status", value: (row) => row.extension_payment_status },
    { header: "Extension Payment Mode", value: (row) => row.extension_payment_mode },
    { header: "Extension Payment Reference", value: (row) => row.extension_payment_reference },
    { header: "Extension Confirmed By", value: (row) => row.extension_confirmed_by },
    { header: "Extension Confirmed At (IST)", value: (row) => row.extension_confirmed_at_ist },
    { header: t("reception.refundAdjustment"), value: (row) => row.refund_adjustment },
    { header: t("bookingUi.policyApplied"), value: (row) => row.policy_applied },
    { header: t("exports.createdAtIst"), value: (row) => row.created_at_ist },
  ];

  const exportReport = (type) => {
    if (!reportRows.length) {
      toast.error(t("shared.noResults"));
      return;
    }

    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      title: t("admin.bookingCheckoutReport"),
      columns: exportColumns,
      rows: reportRows,
      filters: queryFilters,
    };

    if (type === "excel") {
      exportTableExcel({ ...payload, filename: `bookings-report-${date}.xls` });
      toast.success(t("shared.actionCompleted"));
      return;
    }

    exportTablePdf({ ...payload, filename: `bookings-report-${date}.pdf` });
    toast.success(t("shared.actionCompleted"));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("layout.reports")}
        title={t("admin.reportsTitle")}
        description={t("admin.reportsDescription")}
        actions={(
          <div className="flex gap-2">
            <Button onClick={() => exportReport("excel")}>{t("shared.exportExcel")}</Button>
            <Button variant="outline" onClick={() => exportReport("pdf")}>{t("shared.exportPdf")}</Button>
          </div>
        )}
      />

      <div className="section-card p-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SelectField
          label={t("shared.date")}
          value={filters.year}
          onChange={(event) => setFilters((current) => ({ ...current, year: event.target.value }))}
          options={yearOptions}
        />
        <SelectField
          label={t("shared.thisMonth")}
          value={filters.month}
          onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))}
          options={monthOptions}
        />
        <SelectField
          label={t("shared.category")}
          value={filters.category}
          onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
          options={categoryOptions}
        />
        <SelectField
          label={t("reception.bookingStatus")}
          value={filters.status}
          onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          options={statusOptions}
        />
        <InputField
          label={`${t("common.from")} (${t("shared.optional")})`}
          type="date"
          value={filters.dateFrom}
          onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
        />
        <InputField
          label={`${t("customer.checkOut")} (${t("shared.optional")})`}
          type="date"
          value={filters.dateTo}
          onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
        />
      </div>

      {isLoading ? (
        <div className="section-card p-6 text-sm text-mutedText">{t("common.loading")}</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="section-card p-5">
              <p className="text-sm text-mutedText">{t("admin.totalRevenue")}</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.total_revenue || 0)}</p>
            </div>
            <div className="section-card p-5">
              <p className="text-sm text-mutedText">{t("admin.totalBookings")}</p>
              <p className="mt-2 text-2xl font-semibold">{summary.total_bookings || 0}</p>
            </div>
            <div className="section-card p-5">
              <p className="text-sm text-mutedText">{t("admin.occupancyRate")}</p>
              <p className="mt-2 text-2xl font-semibold">{summary.occupancy_rate || 0}%</p>
            </div>
            <div className="section-card p-5">
              <p className="text-sm text-mutedText">{t("admin.gstCollected")}</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.gst_collected || 0)}</p>
            </div>
            <div className="section-card p-5">
              <p className="text-sm text-mutedText">{t("admin.earlyCheckouts")}</p>
              <p className="mt-2 text-2xl font-semibold">{summary.early_checked_out || 0}</p>
            </div>
            <div className="section-card p-5">
              <p className="text-sm text-mutedText">Confirmed Extension Revenue</p>
              <p className="mt-2 text-2xl font-semibold">{formatCurrency(summary.extension_revenue || 0)}</p>
              <p className="text-xs text-mutedText">{summary.extension_payment_count || 0} payment(s)</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <RevenueChart data={revenueSeries} />
            <OccupancyGrid occupancy={data?.occupancy || {}} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="section-card p-5">
              <h3 className="font-heading text-2xl">{t("admin.revenueByCategory")}</h3>
              <div className="mt-4 divide-y divide-divider">
                {(data?.revenueByCategory || []).map((item) => (
                  <div key={item.category} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{roomCategoryLabel(t, item.category)}</p>
                      <p className="text-xs text-mutedText">{item.bookings} bookings</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(item.revenue)}</p>
                  </div>
                ))}
                {(data?.revenueByCategory || []).length === 0 ? (
                  <p className="py-3 text-sm text-mutedText">{t("shared.noResults")}</p>
                ) : null}
              </div>
            </div>

            <div className="section-card p-5">
              <h3 className="font-heading text-2xl">{t("admin.bookingsByStatus")}</h3>
              <div className="mt-4 divide-y divide-divider">
                {(data?.bookingsByStatus || []).map((item) => (
                  <div key={item.status} className="py-3 flex items-center justify-between">
                    <p className="font-semibold capitalize">{String(item.status).replace(/_/g, " ")}</p>
                    <p className="font-semibold">{item.count}</p>
                  </div>
                ))}
                {(data?.bookingsByStatus || []).length === 0 ? (
                  <p className="py-3 text-sm text-mutedText">{t("shared.noResults")}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="section-card overflow-hidden">
            <div className="border-b border-divider p-5">
              <h3 className="font-heading text-2xl">{t("admin.bookingCheckoutReport")}</h3>
              <p className="mt-1 text-sm text-mutedText">{t("admin.reportIstNote")}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[1900px] w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-mutedText">
                  <tr>
                    {[
                      t("common.booking"),
                      t("shared.customer"),
                      t("common.room"),
                      t("customer.checkIn"),
                      t("exports.originalCheckout"),
                      t("exports.actualCheckoutIst"),
                      t("exports.earlyCheckout"),
                      t("shared.reason"),
                      t("exports.checkedOutBy"),
                      t("exports.roomStatusAfterCheckout"),
                      t("bookingUi.paymentSummary"),
                      "Extension Payment",
                      t("bookingUi.policyApplied"),
                    ].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {reportRows.map((row) => (
                    <tr key={row.booking_id} className="border-t border-divider align-top">
                      <td className="px-4 py-3 font-semibold">{row.booking_ref}</td>
                      <td className="px-4 py-3">{row.customer_name}</td>
                      <td className="px-4 py-3">{t("ops.room")} {row.room_number}<br /><span className="text-xs text-mutedText">{roomCategoryLabel(t, row.category)}</span></td>
                      <td className="px-4 py-3">{row.check_in_date}<br /><span className="text-xs text-mutedText">{row.actual_check_in_ist || "Not checked in"}</span></td>
                      <td className="px-4 py-3">{row.original_checkout_date}</td>
                      <td className="px-4 py-3">{row.actual_checkout_ist || "Not checked out"}</td>
                      <td className="px-4 py-3 font-semibold">{row.early_checkout === "Yes" ? t("shared.yes") : t("shared.no")}</td>
                      <td className="max-w-64 px-4 py-3">{row.early_checkout_reason || "—"}</td>
                      <td className="px-4 py-3">{row.checked_out_by || "—"}</td>
                      <td className="px-4 py-3 capitalize">{row.room_status_after_checkout || "—"}</td>
                      <td className="px-4 py-3">
                        {t("shared.totalAmount")}: {formatCurrency(row.total_amount)}<br />
                        {t("shared.paidAmount")}: {formatCurrency(row.paid_amount)}<br />
                        {t("shared.remainingAmount")}: {formatCurrency(row.remaining_amount)}
                      </td>
                      <td className="px-4 py-3">
                        Amount: {formatCurrency(row.extension_amount)}<br />
                        Status: {row.extension_payment_status || "N/A"}<br />
                        Mode: {row.extension_payment_mode || "N/A"}<br />
                        Ref: {row.extension_payment_reference || "N/A"}<br />
                        <span className="text-xs text-mutedText">
                          {row.extension_confirmed_by || ""} {row.extension_confirmed_at_ist || ""}
                        </span>
                      </td>
                      <td className="max-w-80 px-4 py-3">{row.policy_applied || "Standard settlement"}</td>
                    </tr>
                  ))}
                  {!reportRows.length ? (
                    <tr><td colSpan="13" className="p-8 text-center text-mutedText">{t("shared.noResults")}</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="section-card overflow-hidden">
            <div className="border-b border-divider p-5">
              <h3 className="font-heading text-2xl">Extension Payment Report</h3>
              <p className="mt-1 text-sm text-mutedText">Only staff-confirmed manual extension payments are included.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-mutedText">
                  <tr>
                    {["Booking", "Customer / Room", "Extended Stay", "Amount", "Mode / Reference", "Confirmed By / Time"].map((label) => (
                      <th key={label} className="px-4 py-3">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.extensionPayments || []).map((payment) => (
                    <tr key={payment.payment_id} className="border-t border-divider">
                      <td className="px-4 py-3 font-semibold">{payment.booking_ref}</td>
                      <td className="px-4 py-3">{payment.customer_name}<br /><span className="text-xs text-mutedText">Room {payment.room_number}</span></td>
                      <td className="px-4 py-3">{payment.original_checkout_date} → {payment.extended_checkout_date}<br /><span className="text-xs text-mutedText">{payment.extension_nights} night(s)</span></td>
                      <td className="px-4 py-3 font-semibold">{formatCurrency(payment.extension_amount)}</td>
                      <td className="px-4 py-3 capitalize">{payment.extension_payment_mode}<br /><span className="text-xs text-mutedText">{payment.extension_payment_reference || "No reference"}</span></td>
                      <td className="px-4 py-3">{payment.extension_confirmed_by}<br /><span className="text-xs text-mutedText">{payment.extension_confirmed_at_ist}</span></td>
                    </tr>
                  ))}
                  {(data?.extensionPayments || []).length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-mutedText">{t("shared.noResults")}</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
