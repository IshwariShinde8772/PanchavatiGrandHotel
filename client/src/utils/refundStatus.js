const REFUND_STATUS_LABELS = {
  pending: "Pending Admin Approval",
  pending_admin_approval: "Pending Admin Approval",
  approved: "Processing",
  processing: "Processing",
  completed: "Completed / Refunded",
  refunded: "Completed / Refunded",
  failed: "Failed",
  rejected: "Rejected",
  no_refund: "No Refund / Not Applicable",
  not_applicable: "No Refund / Not Applicable",
};

const REFUND_STATUS_STYLES = {
  pending: "bg-amber-100 text-amber-800",
  pending_admin_approval: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  refunded: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
  rejected: "bg-slate-200 text-slate-800",
  no_refund: "bg-gray-100 text-gray-700",
  not_applicable: "bg-gray-100 text-gray-700",
};

export function getRefundStatusLabel(status, t) {
  const normalized = String(status || "").toLowerCase();
  if (t && Object.prototype.hasOwnProperty.call(REFUND_STATUS_LABELS, normalized)) {
    return t(`statuses.refund.${normalized}`);
  }
  return REFUND_STATUS_LABELS[normalized] || String(status || "Unknown").replaceAll("_", " ");
}

export function getCustomerRefundStatusLabel(status, t) {
  const normalized = String(status || "").toLowerCase();
  if (t) return getRefundStatusLabel(normalized, t);
  if (["no_refund", "not_applicable"].includes(normalized)) return "No Refund Applicable";
  return `Refund ${getRefundStatusLabel(normalized).replace(" / Refunded", "")}`;
}

export function getRefundStatusStyle(status) {
  return REFUND_STATUS_STYLES[String(status || "").toLowerCase()] || "bg-gray-100 text-gray-700";
}
