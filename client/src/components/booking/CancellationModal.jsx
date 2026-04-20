import InputField from "../forms/InputField";
import Modal from "../common/Modal";
import Button from "../common/Button";

export default function CancellationModal({ open, onClose, reason, setReason, onConfirm }) {
  return (
    <Modal open={open} onClose={onClose} title="Cancel Booking">
      <InputField label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Change of plans / Emergency / Other" />
      <p className="mt-3 text-sm text-mutedText">Free cancellation before 48 hours. Late cancellation may incur one-night penalty.</p>
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={onClose}>Go Back</Button>
        <Button variant="secondary" onClick={onConfirm}>Confirm Cancel</Button>
      </div>
    </Modal>
  );
}

