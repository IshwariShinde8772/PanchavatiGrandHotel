import Button from "./Button";
import Modal from "./Modal";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Please confirm",
  description = "Are you sure you want to continue?",
  confirmText = "Confirm",
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-mutedText">{description}</p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onClose}>Go Back</Button>
        <Button variant="secondary" onClick={onConfirm}>{confirmText}</Button>
      </div>
    </Modal>
  );
}

