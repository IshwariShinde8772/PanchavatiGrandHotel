import { useParams } from "react-router-dom";
import BookingConfirmation from "../../components/booking/BookingConfirmation";

export default function BookingConfirmPage() {
  const { bookingRef } = useParams();
  return (
    <div className="container-shell py-16">
      <BookingConfirmation bookingRef={bookingRef} amountLabel="Payment and booking details have been saved to your account." />
    </div>
  );
}
