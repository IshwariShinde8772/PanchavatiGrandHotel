import InputField from "../forms/InputField";
import Modal from "../common/Modal";
import Button from "../common/Button";
import { useTranslation } from "react-i18next";

export default function CancellationModal({ open, onClose, reason, setReason, onConfirm, preview, busy = false }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={t("bookingUi.cancelBooking")}>
      <InputField label={t("shared.reason")} value={reason} onChange={(event) => setReason(event.target.value)} placeholder={t("bookingUi.cancellationReason")} />
      <p className="mt-3 text-sm text-mutedText">{t("bookingUi.cancellationPolicyShort")}</p>
      {preview ? (
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-4 text-sm">
          <span>{t("bookingUi.baseAmount")}</span><strong>INR {Number(preview.baseAmount || 0).toFixed(2)}</strong>
          <span>{t("bookingUi.offerDiscount")}</span><strong>-INR {Number(preview.offerDiscountAmount || 0).toFixed(2)}</strong>
          <span>{t("bookingUi.couponDiscount")}</span><strong>-INR {Number(preview.couponDiscountAmount || 0).toFixed(2)}</strong>
          <span>{t("shared.totalAmount")}</span><strong>INR {Number(preview.totalAmount).toFixed(2)}</strong>
          <span>{t("shared.paidAmount")}</span><strong>INR {Number(preview.paidAmount).toFixed(2)}</strong>
          <span>{t("bookingUi.cancellationCharge")}</span><strong>INR {Number(preview.cancellationCharge).toFixed(2)}</strong>
          <span>{t("bookingUi.refundAmount")}</span><strong>INR {Number(preview.refundAmount).toFixed(2)}</strong>
          <p className="col-span-2 mt-2 text-mutedText">{preview.message}</p>
        </div>
      ) : null}
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onClose}>{t("shared.goBack")}</Button>
        <Button variant="secondary" onClick={onConfirm} disabled={busy || !preview}>{busy ? t("shared.processing") : t("bookingUi.confirmCancel")}</Button>
      </div>
    </Modal>
  );
}

