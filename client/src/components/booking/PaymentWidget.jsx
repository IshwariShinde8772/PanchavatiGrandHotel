import Button from "../common/Button";

export default function PaymentWidget({ onPayOnline }) {
  return (
    <div className="rounded-[28px] border border-divider bg-white p-5">
      <h3 className="font-heading text-2xl">Pay With QR</h3>
      <p className="mt-2 text-sm text-mutedText">Generate a booking QR, scan it in any UPI app, and complete payment before the timer ends.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {["UPI QR", "Timer Lock", "Pending Resume", "Customer Ledger"].map((item) => (
          <div key={item} className="rounded-2xl bg-saffronLight p-4 text-sm">{item}</div>
        ))}
      </div>
      <Button className="mt-5 w-full" onClick={onPayOnline}>Generate QR Payment</Button>
    </div>
  );
}
