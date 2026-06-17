import Button from "../common/Button";

export default function PostponePaymentOption({ onReserve, busy = false }) {
  return (
    <div className="rounded-[28px] border-2 border-saffron bg-saffronLight p-5">
      <h3 className="font-heading text-2xl">Reserve Now. Pay When You Arrive.</h3>
      <ul className="mt-4 space-y-2 text-sm text-mutedText">
        <li>No payment needed today</li>
        <li>Room fully reserved in your name</li>
        <li>Pay by cash, card, or UPI at check-in</li>
        <li>Free cancellation up to 48h before arrival</li>
      </ul>
      <Button variant="gold" className="mt-5 w-full" onClick={onReserve} disabled={busy}>
        {busy ? "Reserving..." : "Reserve Room"}
      </Button>
    </div>
  );
}

