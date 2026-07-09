import { Link } from "react-router-dom";
import Button from "../common/Button";
import { useTranslation } from "react-i18next";

export default function BookingConfirmation({ bookingRef = "-", amountLabel = "Paid Online" }) {
  const { t } = useTranslation();
  return (
    <div className="section-card mx-auto max-w-2xl p-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
        <img src="/assets/images/lotus-icon.svg" alt="Lotus" className="h-12 w-12" />
      </div>
      <p className="mt-4 font-accent text-2xl text-saffron">धन्यवाद</p>
      <h2 className="mt-2 font-heading text-4xl">{t("bookingUi.bookingConfirmed")}</h2>
      <p className="mt-3 text-mutedText">{t("bookingUi.bookingReference", { reference: bookingRef })}</p>
      <p className="mt-2 text-lg font-semibold text-godavari">{amountLabel}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button as={Link} to="/customer/my-bookings">{t("bookingUi.viewTrips")}</Button>
        <Button as={Link} to="/" variant="outline">{t("bookingUi.backHome")}</Button>
      </div>
    </div>
  );
}
