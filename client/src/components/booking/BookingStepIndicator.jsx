import { useTranslation } from "react-i18next";

export default function BookingStepIndicator({ currentStep = 0 }) {
  const { t } = useTranslation();
  const labels = [t("bookingUi.stayDetails"), t("bookingUi.guestInfo"), t("bookingUi.idNationality"), t("common.payment")];
  return (
    <div className="grid grid-cols-4 gap-2">
      {labels.map((label, index) => (
        <div key={label} className="flex flex-col items-center gap-2 text-center">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${index <= currentStep ? "bg-saffron text-white" : "bg-white text-mutedText"} border border-divider`}>
            {index + 1}
          </div>
          <p className="text-xs font-medium text-mutedText md:text-sm">{label}</p>
        </div>
      ))}
    </div>
  );
}

