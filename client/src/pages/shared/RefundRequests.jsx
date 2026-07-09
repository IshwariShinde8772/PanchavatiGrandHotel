import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import { refundAPI } from "../../api/refundAPI";
import { formatCurrency } from "../../utils/formatCurrency";
import {
  getRefundStatusLabel,
  getRefundStatusStyle,
} from "../../utils/refundStatus";
import { formatISTDateTimeForReport } from "../../utils/hotelDate";

const FILTER_STATUSES = [
  "pending_admin_approval",
  "processing",
  "completed",
  "failed",
  "rejected",
];
const PENDING_STATUSES = ["pending_admin_approval", "pending"];

function displayDate(value) {
  return value ? formatISTDateTimeForReport(value) : "—";
}

function roomDetails(item) {
  const room = item.booking?.room;
  if (!room) return "—";
  return [room.room_number ? `Room ${room.room_number}` : room.name, room.category]
    .filter(Boolean)
    .join(" · ");
}

function razorpayPaymentId(item) {
  return item.razorpay_payment_id
    || item.payment_reference_id
    || item.booking?.razorpay_payment_id
    || "";
}

function razorpayRefundId(item) {
  return item.razorpay_refund_id || item.refund_transaction_id || "";
}

function StatusBadge({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${getRefundStatusStyle(status)}`}>
      {getRefundStatusLabel(status, t)}
    </span>
  );
}

function ReceptionistRefundTable({ items }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-2xl border border-divider bg-white">
      <table className="min-w-[1700px] text-left text-sm">
        <thead className="bg-slate-50 text-mutedText">
          <tr>
            {[
              t("shared.bookingId"),
              t("shared.customer"),
              t("common.room"),
              t("shared.totalAmount"),
              t("shared.paidAmount"),
              t("bookingUi.cancellationCharge"),
              t("bookingUi.refundAmount"),
              t("shared.reason"),
              t("refunds.refundStatus"),
              t("refunds.requestedAt"),
              t("refunds.cancelledAt"),
              t("refunds.razorpayPaymentId"),
              t("refunds.razorpayRefundId"),
              t("refunds.failureReason"),
              t("refunds.rejectionReason"),
            ].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3">{label}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-divider align-top">
              <td className="whitespace-nowrap px-4 py-3 font-semibold">{item.booking?.booking_ref || item.booking_id}</td>
              <td className="px-4 py-3">
                <span className="font-medium">{item.customer_name}</span>
                <br />
                <span className="text-xs text-mutedText">{item.customer_email || item.customer_phone || "—"}</span>
              </td>
              <td className="px-4 py-3">{roomDetails(item)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatCurrency(item.total_booking_amount)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatCurrency(item.amount_paid)}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatCurrency(item.cancellation_charge)}</td>
              <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatCurrency(item.refund_amount)}</td>
              <td className="max-w-64 px-4 py-3">{item.refund_reason || "—"}</td>
              <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
              <td className="whitespace-nowrap px-4 py-3">{displayDate(item.requested_at)}</td>
              <td className="whitespace-nowrap px-4 py-3">{displayDate(item.booking?.cancelled_at)}</td>
              <td className="max-w-52 break-all px-4 py-3 text-xs">{razorpayPaymentId(item) || "—"}</td>
              <td className="max-w-52 break-all px-4 py-3 text-xs">{razorpayRefundId(item) || "—"}</td>
              <td className="max-w-64 px-4 py-3 text-xs text-red-700">{item.failure_reason || "—"}</td>
              <td className="max-w-64 px-4 py-3 text-xs">{item.rejection_reason || "—"}</td>
            </tr>
          ))}
          {!items.length ? (
            <tr>
            <td colSpan="15" className="px-4 py-8 text-center text-mutedText">{t("refunds.noRequests")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function RefundDetails({ item }) {
  const { t } = useTranslation();
  const rows = [
    [t("shared.bookingId"), item.booking?.booking_ref || item.booking_id],
    [t("shared.customer"), item.customer_name],
    [t("common.room"), roomDetails(item)],
    [t("shared.details"), `${item.booking?.booking_type || "—"} / ${item.booking?.reservation_type || "—"}`],
    [t("shared.paymentMethod"), item.booking?.payment_mode || item.booking?.payment_method || "—"],
    [t("shared.totalAmount"), formatCurrency(item.total_booking_amount)],
    [t("shared.paidAmount"), formatCurrency(item.amount_paid)],
    [t("bookingUi.cancellationCharge"), formatCurrency(item.cancellation_charge)],
    [t("bookingUi.refundAmount"), formatCurrency(item.refund_amount)],
    [t("shared.reason"), item.refund_reason || "—"],
    [t("refunds.refundStatus"), getRefundStatusLabel(item.status, t)],
    [t("refunds.requestedAt"), displayDate(item.requested_at)],
    [t("refunds.cancelledAt"), displayDate(item.booking?.cancelled_at)],
    [t("refunds.processedAt"), displayDate(item.processed_at || item.approved_at)],
    [t("refunds.refundedAt"), displayDate(item.refunded_at || item.completed_at)],
    [t("refunds.razorpayPaymentId"), razorpayPaymentId(item) || "—"],
    [t("refunds.razorpayRefundId"), razorpayRefundId(item) || "—"],
    [t("bookingUi.policyApplied"), item.cancellation_policy_applied || "—"],
    [t("refunds.failureReason"), item.failure_reason || "—"],
    [t("refunds.rejectionReason"), item.rejection_reason || "—"],
  ];

  return (
    <div className="grid min-w-0 gap-3 text-sm sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div key={label} className="min-w-0 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-mutedText">{label}</p>
          <p className="mt-1 min-w-0 break-words font-medium [overflow-wrap:anywhere]">{value}</p>
        </div>
      ))}
    </div>
  );
}

function AdminRefundTable({ items, reload }) {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState(null);
  const [detailItem, setDetailItem] = useState(null);

  const act = async (item, action) => {
    try {
      if (action === "approve") {
        if (!window.confirm(t("refunds.approveConfirm", { amount: formatCurrency(item.refund_amount) }))) return;
      } else {
        const reason = window.prompt(t("refunds.rejectionPrompt"));
        if (!reason?.trim()) return;
        item = { ...item, rejectionReason: reason.trim() };
      }

      setBusyId(item.id);
      const result = action === "approve"
        ? await refundAPI.approve(item.id)
        : await refundAPI.reject(item.id, item.rejectionReason);
      toast.success(result.message || t("shared.actionCompleted"));
      await reload();
    } catch (error) {
      toast.error(t("shared.actionFailed"));
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="overflow-x-auto rounded-2xl border border-divider bg-white">
        <table className="min-w-[2300px] text-left text-sm">
          <thead className="bg-slate-50 text-mutedText">
            <tr>
              {[
                t("shared.bookingId"),
                t("shared.customer"),
                t("common.room"),
                t("shared.details"),
                t("shared.paymentMethod"),
                t("shared.totalAmount"),
                t("shared.paidAmount"),
                t("bookingUi.cancellationCharge"),
                t("bookingUi.refundAmount"),
                t("shared.reason"),
                t("refunds.refundStatus"),
                t("refunds.requestedAt"),
                t("refunds.cancelledAt"),
                t("refunds.razorpayPaymentId"),
                t("refunds.razorpayRefundId"),
                t("refunds.refundedAt"),
                t("refunds.failureReason"),
                t("common.actions"),
              ].map((label) => <th key={label} className="whitespace-nowrap px-4 py-3">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const pending = PENDING_STATUSES.includes(item.status);
              const paymentId = razorpayPaymentId(item);
              return (
                <tr key={item.id} className="border-t border-divider align-top">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{item.booking?.booking_ref || item.booking_id}</td>
                  <td className="px-4 py-3">{item.customer_name}<br /><span className="text-xs text-mutedText">{item.customer_email || item.customer_phone || "—"}</span></td>
                  <td className="px-4 py-3">{roomDetails(item)}</td>
                  <td className="px-4 py-3">{item.booking?.booking_type || "—"}<br /><span className="text-xs text-mutedText">{item.booking?.reservation_type || ""}</span></td>
                  <td className="px-4 py-3">{item.booking?.payment_mode || item.booking?.payment_method || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatCurrency(item.total_booking_amount)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatCurrency(item.amount_paid)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{formatCurrency(item.cancellation_charge)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold">{formatCurrency(item.refund_amount)}</td>
                  <td className="max-w-64 px-4 py-3">{item.refund_reason || "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3">{displayDate(item.requested_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3">{displayDate(item.booking?.cancelled_at)}</td>
                  <td className="max-w-52 break-all px-4 py-3 text-xs">{paymentId || "—"}</td>
                  <td className="max-w-52 break-all px-4 py-3 text-xs">{razorpayRefundId(item) || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{displayDate(item.refunded_at || item.completed_at || item.processed_at)}</td>
                  <td className="max-w-64 px-4 py-3 text-xs text-red-700">{item.failure_reason || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex min-w-52 flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDetailItem(item)}>{t("shared.viewDetails")}</Button>
                      {pending ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => act(item, "approve")}
                            disabled={busyId === item.id || !paymentId || Number(item.refund_amount) <= 0}
                            title={!paymentId ? "Original Razorpay payment ID is missing" : ""}
                          >
                            {busyId === item.id ? t("shared.processing") : t("refunds.approveRefund")}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => act(item, "reject")} disabled={busyId === item.id}>
                            {t("shared.reject")}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!items.length ? (
              <tr>
                <td colSpan="18" className="px-4 py-8 text-center text-mutedText">{t("refunds.noRequests")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal open={Boolean(detailItem)} onClose={() => setDetailItem(null)} title={t("refunds.detailsTitle")}>
        {detailItem ? <RefundDetails item={detailItem} /> : null}
      </Modal>
    </>
  );
}

export default function RefundRequests({ portal }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await refundAPI.list(portal, status ? { status } : {});
      setItems(result.data || []);
    } catch (error) {
      toast.error(t("shared.actionFailed"));
    }
  }, [portal, status]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 30000);
    return () => window.clearInterval(timer);
  }, [load]);

  const isAdmin = portal === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("common.payment")}
        title={t("refunds.title")}
        description={isAdmin
          ? t("refunds.adminDescription")
          : t("refunds.receptionDescription")}
      />
      <select
        className="rounded-xl border border-divider bg-white px-4 py-3 text-sm"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      >
        <option value="">{t("shared.allStatuses")}</option>
        {FILTER_STATUSES.map((value) => <option key={value} value={value}>{getRefundStatusLabel(value, t)}</option>)}
      </select>
      {isAdmin
        ? <AdminRefundTable items={items} reload={load} />
        : <ReceptionistRefundTable items={items} />}
    </div>
  );
}
