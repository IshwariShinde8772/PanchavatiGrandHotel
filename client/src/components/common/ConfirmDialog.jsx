import Button from "./Button";
import Modal from "./Modal";
import { useTranslation } from "react-i18next";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
}) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={title || t("shared.pleaseConfirm")}>
      <p className="text-mutedText">{description || t("shared.continueConfirm")}</p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onClose}>{t("shared.goBack")}</Button>
        <Button variant="secondary" onClick={onConfirm}>{confirmText || t("shared.confirm")}</Button>
      </div>
    </Modal>
  );
}

