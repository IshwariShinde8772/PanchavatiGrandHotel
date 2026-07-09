import InputField from "../forms/InputField";
import PhoneWithCountryCode from "../forms/PhoneWithCountryCode";
import SelectField from "../forms/SelectField";
import { useTranslation } from "react-i18next";

export default function GuestDetailsForm({ form, setForm, errors = {} }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InputField error={errors.full_name} label={t("shared.fullName")} value={form.full_name || ""} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
      <InputField error={errors.email} label={t("auth.emailAddress")} type="email" value={form.email || ""} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <div className="md:col-span-2">
        <PhoneWithCountryCode value={form.phone || ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
        {errors.phone ? <p className="mt-1 text-xs font-semibold text-red-600">{errors.phone}</p> : null}
      </div>
      <SelectField
        label={t("customer.idType")}
        value={form.id_type || ""}
        onChange={(event) => setForm({ ...form, id_type: event.target.value })}
        options={[
          { label: t("bookingUi.selectIdType"), value: "" },
          { label: `Aadhaar / ${t("customer.nationalId")}`, value: "national_id" },
          { label: "Aadhaar", value: "aadhaar" },
          { label: t("customer.passport"), value: "passport" },
          { label: t("customer.drivingLicense"), value: "driving_license" },
          { label: t("customer.other"), value: "other" },
        ]}
      />
      <InputField error={errors.id_number} label={t("customer.idNumber")} value={form.id_number || ""} onChange={(event) => setForm({ ...form, id_number: event.target.value })} />
      {errors.id_type ? <p className="text-xs font-semibold text-red-600 md:col-span-2">{errors.id_type}</p> : null}
      <InputField label={t("bookingUi.address")} className="md:col-span-2" value={form.address || ""} onChange={(event) => setForm({ ...form, address: event.target.value })} />
    </div>
  );
}

