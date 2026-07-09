import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Search, RefreshCw, LogIn, LogOut, FileText, User, Calendar, Edit } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import PaginationControls from "../../components/common/PaginationControls";
import Button from "../../components/common/Button";
import SelectField from "../../components/forms/SelectField";
import { bookingAPI } from "../../api/bookingAPI";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  DATE_FILTER_OPTIONS,
  formatBookedDate,
  formatHotelDateTime,
  formatHotelTime,
  getBookingActionState,
  getHotelDate,
} from "../../utils/hotelDate";
import { exportTableExcel, exportTablePdf } from "../../utils/exportReports";
import { DEFAULT_PAGE_SIZE, getPaginationMeta } from "../../utils/paginationMeta";
import { useTranslation } from "react-i18next";
import {
  bookingActionLabel,
  bookingActionReasonLabel,
  bookingStatusLabel,
  paymentStatusLabel,
  roomCategoryLabel,
} from "../../utils/i18nLabels";

const STATUS_OPTIONS = [
  { label: "All Status", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Checked In", value: "checked_in" },
  { label: "Checked Out", value: "checked_out" },
  { label: "Cancelled", value: "cancelled" },
];

function todayDateInput() {
  return getHotelDate();
}

function addDays(dateValue, days) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return todayDateInput();
  }

  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isCheckedInStatus(status) {
  return status === "checked_in";
}

function canPostponeStatus(status) {
  return ["pending", "confirmed"].includes(status);
}

function getTabsForBooking(status) {
  if (status === "cancelled") {
    return [
      { id: "overview", labelKey: "shared.viewDetails", icon: User },
      { id: "details", labelKey: "bookingUi.guestDetails", icon: FileText },
    ];
  }

  if (isCheckedInStatus(status)) {
    return [
      { id: "overview", labelKey: "shared.viewDetails", icon: User },
      { id: "checkinout", labelKey: "reception.checkOut", icon: LogOut },
      { id: "extend", labelKey: "layout.extensions", icon: Calendar },
    ];
  }

  return [
    { id: "overview", labelKey: "shared.viewDetails", icon: User },
    { id: "checkinout", labelKey: "layout.checkInOut", icon: LogIn },
    { id: "extend", labelKey: "layout.extensions", icon: Edit },
    { id: "details", labelKey: "bookingUi.guestDetails", icon: FileText },
  ];
}

export default function ManageBookings() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [filter, setFilter] = useState({
    q: searchParams.get("ref") || "",
    status: "",
    date_filter: "all",
  });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("overview");
  const [extendData, setExtendData] = useState({ check_out: "", reason: "" });
  const [postponeData, setPostponeData] = useState({ check_in: "", reason: "" });

  useEffect(() => {
    if (!selectedBooking) {
      return;
    }

    setExtendData({ check_out: "", reason: "" });
    setPostponeData({ check_in: addDays(selectedBooking.check_in, 1), reason: "" });
  }, [selectedBooking]);

  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["receptionist-bookings", filter, page],
    queryFn: () => bookingAPI.receptionistList({ ...filter, page, limit: DEFAULT_PAGE_SIZE }),
  });

  const bookings = res?.data || [];
  const pagination = getPaginationMeta(res, bookings.length);
  const selectedStatus = selectedBooking?.status || "";
  const selectedExtensions = selectedBooking?.extensionRequests || [];
  const pendingExtension = selectedExtensions.find((extension) => (
    extension.status !== "rejected"
    && Number(extension.extension_payable_amount ?? extension.extra_amount ?? 0) > 0
    && (
      extension.payment_status !== "paid"
      || Number(
        extension.extension_remaining_amount
        ?? Math.max(
          Number(extension.extension_payable_amount ?? extension.extra_amount ?? 0)
            - Number(extension.extension_paid_amount || 0),
          0
        )
      ) > 0
    )
  ));
  const canPostponeBooking = canPostponeStatus(selectedStatus);
  const availableTabs = useMemo(() => getTabsForBooking(selectedStatus), [selectedStatus]);

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab("overview");
    }
  }, [activeTab, availableTabs]);

  useEffect(() => {
    if (!selectedBooking) {
      return;
    }

    const refreshedBooking = bookings.find((booking) => booking.id === selectedBooking.id);
    if (!refreshedBooking) {
      setSelectedBooking(null);
      return;
    }

    if (refreshedBooking !== selectedBooking) {
      setSelectedBooking(refreshedBooking);
    }
  }, [bookings, selectedBooking]);

  const extendBookingMutation = useMutation({
    mutationFn: ({ id, payload }) => bookingAPI.extend(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-bookings"] });
      setExtendData({ check_out: "", reason: "" });
      setSelectedBooking(data.data || selectedBooking);
      setActiveTab("overview");
      toast.success(t("shared.actionCompleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const postponeBookingMutation = useMutation({
    mutationFn: ({ id, payload }) => bookingAPI.postponeCheckIn(id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-bookings"] });
      setPostponeData({ check_in: "", reason: "" });
      setSelectedBooking(data.data || selectedBooking);
      setActiveTab("overview");
      toast.success(t("shared.actionCompleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const handleExtendBooking = () => {
    if (!isCheckedInStatus(selectedBooking?.status)) {
      toast.error(t("shared.actionFailed"));
      return;
    }

    if (!extendData.check_out || !extendData.reason) {
      toast.error(t("shared.required"));
      return;
    }

    extendBookingMutation.mutate({
      id: selectedBooking.id,
      payload: {
        check_out: extendData.check_out,
        reason: extendData.reason,
        payment_method: "cash",
      },
    });
  };

  const handlePostponeBooking = () => {
    if (isCheckedInStatus(selectedBooking?.status)) {
      toast.error(t("shared.actionFailed"));
      return;
    }

    if (!canPostponeStatus(selectedBooking?.status)) {
      toast.error(t("shared.actionFailed"));
      return;
    }

    if (!postponeData.check_in || !postponeData.reason) {
      toast.error(t("shared.required"));
      return;
    }

    postponeBookingMutation.mutate({
      id: selectedBooking.id,
      payload: {
        check_in: postponeData.check_in,
        reason: postponeData.reason,
      },
    });
  };

  const exportColumns = [
    { header: t("common.reference"), value: (row) => row.booking_ref },
    { header: t("exports.guest"), value: (row) => row.customer?.full_name || "" },
    { header: t("shared.phone"), value: (row) => row.customer?.phone || "" },
    { header: t("common.room"), value: (row) => row.room?.room_number || "" },
    { header: t("customer.checkIn"), value: (row) => `${row.check_in} ${row.check_in_time || ""}`.trim() },
    { header: t("exports.actualCheckInIst"), value: (row) => formatHotelDateTime(row.actual_checkin_time) },
    { header: t("bookingUi.autoCancelDeadline"), value: (row) => formatHotelDateTime(row.auto_cancel_at) },
    { header: t("exports.originalCheckout"), value: (row) => row.original_checkout_date || row.check_out },
    { header: t("exports.actualCheckoutIst"), value: (row) => formatHotelDateTime(row.actual_checkout_time) },
    { header: t("exports.earlyCheckout"), value: (row) => row.is_early_checkout ? t("shared.yes") : t("shared.no") },
    { header: t("exports.earlyCheckoutReason"), value: (row) => row.early_checkout_reason || "" },
    { header: t("exports.checkedOutBy"), value: (row) => row.checked_out_by_display || "" },
    { header: t("exports.roomStatusAfterCheckout"), value: (row) => row.room_status_after_checkout || "" },
    { header: t("shared.totalAmount"), value: (row) => row.total_amount },
    { header: t("shared.paidAmount"), value: (row) => row.amount_paid },
    { header: t("shared.remainingAmount"), value: (row) => Number(row.remaining_amount || 0).toFixed(2) },
    { header: "Extension Amount", value: (row) => (row.extensionRequests || []).reduce((sum, extension) => sum + Number(extension.extension_payable_amount ?? extension.extra_amount ?? 0), 0).toFixed(2) },
    { header: "Extension Payment Status", value: (row) => (row.extensionRequests || []).at(-1)?.payment_status || "" },
    { header: "Extension Payment Mode", value: (row) => (row.extensionRequests || []).at(-1)?.payment_method || "" },
    { header: "Extension Payment Reference", value: (row) => (row.extensionRequests || []).at(-1)?.payment_reference || "" },
    { header: t("common.payment"), value: (row) => paymentStatusLabel(t, row.payment_status) },
    { header: t("common.status"), value: (row) => bookingStatusLabel(t, row) },
    { header: t("exports.createdAtIst"), value: (row) => formatHotelDateTime(row.created_at) },
  ];

  const exportBookings = async (format) => {
    const response = await bookingAPI.receptionistList({ ...filter, page: 1, limit: 1000 });
    const date = new Date().toISOString().slice(0, 10);
    const payload = {
      title: t("layout.bookings"),
      columns: exportColumns,
      rows: response?.data || [],
      filters: filter,
      filename: `reception-bookings-list-${date}.${format === "pdf" ? "pdf" : "xlsx"}`,
    };
    format === "pdf" ? exportTablePdf(payload) : exportTableExcel(payload);
  };

  const renderTabContent = () => {
    if (!selectedBooking) {
      return (
        <div className="flex items-center justify-center h-64 text-mutedText">
          <p>{t("ops.selectBookingHint")}</p>
        </div>
      );
    }

    switch (activeTab) {
      case "overview":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-vineyard mb-2">{t("ops.guestInformation")}</h3>
                <p><strong>{t("shared.name")}:</strong> {selectedBooking.customer?.full_name}</p>
                <p><strong>{t("shared.phone")}:</strong> {selectedBooking.customer?.phone}</p>
                <p><strong>{t("shared.email")}:</strong> {selectedBooking.customer?.email}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-bold text-vineyard mb-2">{t("ops.bookingDetails")}</h3>
                <p><strong>{t("common.reference")}:</strong> {selectedBooking.booking_ref}</p>
                <p><strong>{t("ops.room")}:</strong> {selectedBooking.room?.room_number} ({roomCategoryLabel(t, selectedBooking.room?.category)})</p>
                <p><strong>{t("ops.bookedCheckIn")}:</strong> {formatBookedDate(selectedBooking.check_in)}</p>
                <p><strong>{t("ops.bookedCheckInTime")}:</strong> {formatHotelTime(selectedBooking.check_in_time)}</p>
                <p><strong>{t("bookingUi.autoCancelDeadline")}:</strong> {formatHotelDateTime(selectedBooking.auto_cancel_at)}</p>
                <p><strong>{t("ops.bookedCheckOut")}:</strong> {formatBookedDate(selectedBooking.check_out)}</p>
                <p><strong>{t("ops.actualCheckIn")}:</strong> {formatHotelDateTime(selectedBooking.actual_checkin_time)}</p>
                <p><strong>{t("ops.actualCheckOut")}:</strong> {formatHotelDateTime(selectedBooking.actual_checkout_time)}</p>
                <p><strong>{t("ops.bookingType")}:</strong> {selectedBooking.booking_type || selectedBooking.booked_by}</p>
                <p><strong>{t("shared.paymentStatus")}:</strong> {paymentStatusLabel(t, selectedBooking.payment_status)}</p>
                <p><strong>{t("reception.bookingStatus")}:</strong> {bookingStatusLabel(t, selectedBooking)}</p>
                {selectedBooking.cancellation_reason ? (
                  <p><strong>{t("ops.cancellationReason")}:</strong> {selectedBooking.cancellation_reason}</p>
                ) : null}
                {selectedBooking.is_early_checkout ? (
                  <div className="mt-3 rounded-lg bg-blue-50 p-3 text-blue-800">
                    <p><strong>{t("ops.earlyCheckedOut")}:</strong> {t("shared.yes")}</p>
                    <p><strong>{t("shared.reason")}:</strong> {selectedBooking.early_checkout_reason}</p>
                    <p><strong>{t("ops.checkedOutBy")}:</strong> {selectedBooking.checked_out_by_display || t("shared.notAvailable")}</p>
                    <p><strong>{t("ops.roomStatusAfterCheckout")}:</strong> {selectedBooking.room_status_after_checkout || t("statuses.room.cleaning")}</p>
                    <p><strong>{t("ops.policy")}:</strong> {selectedBooking.early_checkout_policy_applied}</p>
                  </div>
                ) : null}
                {selectedExtensions.length ? (
                  <div className={`mt-3 rounded-lg p-3 ${
                    pendingExtension ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"
                  }`}>
                    <p className="font-semibold">
                      {pendingExtension ? "Extension Payment Pending" : "Extension Payment Paid"}
                    </p>
                    {selectedExtensions.map((extension) => (
                      <div key={extension.id} className="mt-2 text-sm">
                        <p>
                          {extension.original_checkout_date || extension.requested_from}
                          {" → "}
                          {extension.extended_checkout_date || extension.requested_to}
                          {" · "}
                          {formatCurrency(extension.extension_payable_amount ?? extension.extra_amount)}
                        </p>
                        <p>
                          Payment: {extension.payment_status}
                          {extension.payment_method ? ` · ${extension.payment_method}` : ""}
                          {extension.payment_reference ? ` · ${extension.payment_reference}` : ""}
                        </p>
                        {extension.payment_confirmed_at ? (
                          <p>Confirmed: {formatHotelDateTime(extension.payment_confirmed_at)}</p>
                        ) : null}
                      </div>
                    ))}
                    {(selectedBooking.extension_history || []).length ? (
                      <div className="mt-3 border-t border-current/20 pt-3">
                        <p className="font-semibold">Extension timeline</p>
                        {selectedBooking.extension_history.map((event) => (
                          <p key={event.id} className="mt-1 text-xs">
                            {String(event.action).replaceAll("_", " ")} · {formatHotelDateTime(event.created_at)}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-godavari">{selectedBooking.nights}</p>
                <p className="text-sm text-mutedText">{t("customer.nights")}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-godavari">{selectedBooking.guests}</p>
                <p className="text-sm text-mutedText">{t("common.guests")}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-saffron">{formatCurrency(selectedBooking.total_amount)}</p>
                <p className="text-sm text-mutedText">{t("shared.totalAmount")}</p>
              </div>
            </div>
          </div>
        );

      case "checkinout":
        {
          const state = getBookingActionState(selectedBooking);
          return (
            <div className="space-y-6">
              <div className="rounded-lg bg-gray-50 p-6">
                <h3 className="mb-4 flex items-center gap-2 font-bold text-vineyard">
                  {selectedBooking.status === "checked_in" ? <LogOut size={20} /> : <LogIn size={20} />}
                  {t("ops.checkInOutStatus")}
                </h3>
                <div className="mb-4 space-y-2">
                  <p><strong>{t("ops.bookedCheckIn")}:</strong> {formatBookedDate(selectedBooking.check_in)}</p>
                  <p><strong>{t("ops.bookedCheckInTime")}:</strong> {formatHotelTime(selectedBooking.check_in_time)}</p>
                  <p><strong>{t("bookingUi.autoCancelDeadline")}:</strong> {formatHotelDateTime(selectedBooking.auto_cancel_at)}</p>
                  <p><strong>{t("ops.bookedCheckOut")}:</strong> {formatBookedDate(selectedBooking.check_out)}</p>
                  <p><strong>{t("reception.bookingStatus")}:</strong> {bookingStatusLabel(t, selectedBooking)}</p>
                  <p><strong>{t("shared.paymentStatus")}:</strong> {paymentStatusLabel(t, selectedBooking.payment_status)}</p>
                  <p><strong>{t("common.actions")}:</strong> {bookingActionLabel(t, state.label)}</p>
                  {state.reason ? <p className="text-sm text-amber-700">{bookingActionReasonLabel(t, state.reason, selectedBooking)}</p> : null}
                </div>
                <Button
                  onClick={() => navigate(`/receptionist/check-in-out?ref=${encodeURIComponent(selectedBooking.booking_ref)}&dateFilter=all`)}
                  className="w-full"
                >
                  {t("layout.checkInOut")}
                </Button>
              </div>
            </div>
          );
        }

      case "extend":
        if (isCheckedInStatus(selectedBooking.status)) {
          return (
            <div className="space-y-6">
              <div className="max-w-3xl bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold text-vineyard mb-4 flex items-center gap-2">
                  <Calendar size={20} /> {t("ops.extendStay")}
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">{t("ops.currentCheckOut")}</label>
                    <p className="text-lg font-semibold">{selectedBooking.check_out}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t("ops.newCheckOutDate")}</label>
                    <input
                      type="date"
                      className="w-full p-2 border rounded-lg"
                      value={extendData.check_out}
                      onChange={(e) => setExtendData({ ...extendData, check_out: e.target.value })}
                      min={addDays(selectedBooking.check_out, 1)}
                    />
                  </div>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">{t("shared.reason")}</label>
                  <textarea
                    className="w-full p-2 border rounded-lg"
                    rows={3}
                    placeholder={t("ops.extensionReasonPlaceholder")}
                    value={extendData.reason}
                    onChange={(e) => setExtendData({ ...extendData, reason: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleExtendBooking}
                  className="w-full bg-vineyard hover:bg-vineyard/90"
                  disabled={extendBookingMutation.isPending}
                >
                  {extendBookingMutation.isPending ? t("shared.processing") : t("ops.extendBooking")}
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div className="space-y-6">
            <div className="max-w-3xl bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold text-vineyard mb-4 flex items-center gap-2">
                <Edit size={20} /> {t("ops.postponeCheckIn")}
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">{t("ops.currentCheckIn")}</label>
                  <p className="text-lg font-semibold">{selectedBooking.check_in}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{t("ops.newCheckInDate")}</label>
                  <input
                    type="date"
                    className="w-full p-2 border rounded-lg"
                    value={postponeData.check_in}
                    onChange={(e) => setPostponeData({ ...postponeData, check_in: e.target.value })}
                    min={todayDateInput()}
                  />
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">{t("shared.reason")}</label>
                <textarea
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                  placeholder={t("ops.postponementReasonPlaceholder")}
                  value={postponeData.reason}
                  onChange={(e) => setPostponeData({ ...postponeData, reason: e.target.value })}
                />
              </div>
              <Button
                onClick={handlePostponeBooking}
                className="w-full bg-godavari hover:bg-godavari/90"
                disabled={postponeBookingMutation.isPending || !canPostponeBooking}
              >
                {postponeBookingMutation.isPending ? t("shared.processing") : t("ops.postponeCheckIn")}
              </Button>
              {!canPostponeBooking ? (
                <p className="mt-2 text-xs text-mutedText">
                  {t("ops.postponeRestriction")}
                </p>
              ) : null}
            </div>
          </div>
        );

      case "details":
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="font-bold text-vineyard mb-4">{t("ops.customerDetails")}</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-mutedText">{t("shared.fullName")}</label>
                    <p className="font-semibold">{selectedBooking.customer?.full_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mutedText">{t("shared.phone")}</label>
                    <p className="font-semibold">{selectedBooking.customer?.phone}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mutedText">{t("shared.email")}</label>
                    <p className="font-semibold">{selectedBooking.customer?.email || t("ops.notProvided")}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mutedText">{t("ops.nationality")}</label>
                    <p className="font-semibold">{selectedBooking.customer?.nationality || t("ops.notProvided")}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-mutedText">{t("ops.idType")}</label>
                    <p className="font-semibold">{selectedBooking.customer?.id_type || t("ops.notProvided")}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mutedText">{t("ops.idNumber")}</label>
                    <p className="font-semibold">{selectedBooking.customer?.id_number || t("ops.notProvided")}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mutedText">{t("ops.idExpiry")}</label>
                    <p className="font-semibold">{selectedBooking.customer?.id_expiry || t("ops.notProvided")}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-mutedText">{t("ops.specialRequests")}</label>
                    <p className="font-semibold">{selectedBooking.special_requests || t("bookingUi.none")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow={t("layout.bookings")}
        title={t("layout.checkInOut")}
        description={t("reception.checkInOutDescription")}
        actions={<div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => exportBookings("excel")}>{t("shared.exportExcel")}</Button><Button variant="outline" onClick={() => exportBookings("pdf")}>{t("shared.exportPdf")}</Button></div>}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="section-card p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-mutedText" size={18} />
              <input
                type="text"
                placeholder={t("reception.searchBooking")}
                className="w-full pl-10 pr-4 py-2 rounded-xl border-2 border-divider focus:border-saffron outline-none text-sm"
                value={filter.q}
                onChange={(e) => { setPage(1); setFilter({ ...filter, q: e.target.value }); }}
              />
            </div>
            <div className="w-full mb-4">
              <SelectField
                label={t("customer.checkInDate")}
                value={filter.date_filter}
                onChange={(e) => { setPage(1); setFilter({ ...filter, date_filter: e.target.value }); }}
                options={DATE_FILTER_OPTIONS.map((option) => ({
                  ...option,
                  label: t({
                    all: "shared.allDates", today: "shared.today", tomorrow: "shared.tomorrow",
                    this_week: "shared.thisWeek", next_week: "shared.nextWeek", this_month: "shared.thisMonth",
                  }[option.value] || "shared.allDates"),
                }))}
              />
            </div>
            <div className="w-full mb-4">
              <SelectField
                label={t("reception.bookingStatus")}
                value={filter.status}
                onChange={(e) => { setPage(1); setFilter({ ...filter, status: e.target.value }); }}
                options={STATUS_OPTIONS.map((option) => ({
                  ...option,
                  label: option.value ? t(`statuses.booking.${option.value}`) : t("shared.allStatuses"),
                }))}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="w-full flex items-center justify-center gap-2 border-godavari text-godavari mb-4"
            >
              <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /> {t("shared.retry")}
            </Button>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {isLoading ? (
                <p className="p-4 text-center text-mutedText">{t("common.loading")}</p>
              ) : bookings.map((booking) => (
                <button
                  key={booking.id}
                  onClick={() => setSelectedBooking(booking)}
                  className={`w-full p-3 text-left transition-colors rounded-lg border ${
                    selectedBooking?.id === booking.id
                      ? "bg-green-50 border-godavari"
                      : "bg-white border-divider hover:bg-gray-50"
                  }`}
                >
                  <p className="font-bold text-vineyard text-sm">{booking.customer?.full_name}</p>
                  <p className="text-[10px] font-bold text-godavari">{booking.booking_type === "manual" || (!booking.booking_type && booking.booked_by === "receptionist") ? t("admin.manualBookings") : t("admin.onlineBookings")}</p>
                  <p className="text-[10px] text-mutedText">{t("common.room")} {booking.room?.room_number} - {roomCategoryLabel(t, booking.room?.category)}</p>
                  <p className="mt-1 text-[11px] text-mutedText">
                    {formatBookedDate(booking.check_in)} • {formatHotelTime(booking.check_in_time)} → {formatBookedDate(booking.check_out)}
                  </p>
                  <p className="text-[11px] text-mutedText">{t("bookingUi.autoCancelDeadline")}: {formatHotelDateTime(booking.auto_cancel_at)}</p>
                  <p className="text-[11px] text-mutedText">
                    {t("common.payment")}: {paymentStatusLabel(t, booking.payment_status)} - {t("common.status")}: {bookingStatusLabel(t, booking)}
                  </p>
                  <p className="text-xs font-semibold text-saffron">
                    {t("shared.remainingAmount")}: {formatCurrency(booking.remaining_amount)}
                  </p>
                </button>
              ))}
              {bookings.length === 0 && !isLoading && (
                <p className="p-4 text-center text-mutedText italic">{t("shared.noResults")}</p>
              )}
            </div>
            <PaginationControls page={pagination.currentPage} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="section-card">
            <div className="border-b border-divider">
              <div className="flex">
                {availableTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-3 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? "border-saffron text-saffron"
                          : "border-transparent text-mutedText hover:text-vineyard"
                      }`}
                    >
                      <Icon size={16} />
                      {t(tab.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-6">
              {renderTabContent()}
            </div>

            {selectedBooking && (
              <div className="border-t border-divider p-6">
                <div className="flex gap-3">
                  <Button
                    onClick={() => navigate(`/receptionist/bill-generator?ref=${selectedBooking.booking_ref}`)}
                    className="flex items-center gap-2 bg-white border border-divider text-mutedText hover:bg-gray-50"
                    disabled={Boolean(pendingExtension)}
                  >
                    <FileText size={16} /> Generate Bill
                  </Button>
                </div>
                {pendingExtension ? (
                  <p className="mt-2 text-sm font-semibold text-amber-700">
                    Extension payment must be confirmed before generating final bill.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
