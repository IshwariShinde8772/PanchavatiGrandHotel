import Button from "../common/Button";
import InputField from "../forms/InputField";
import SelectField from "../forms/SelectField";
import { useTranslation } from "react-i18next";

export default function RoomFilters({ filters, onChange, onReset }) {
  const { t } = useTranslation();

  return (
    <div className="section-card p-5">
      <div className="grid gap-4">
        <InputField label={t("room.checkIn")} type="date" value={filters.checkIn || ""} onChange={(event) => onChange("checkIn", event.target.value)} />
        <InputField label={t("room.checkOut")} type="date" value={filters.checkOut || ""} onChange={(event) => onChange("checkOut", event.target.value)} />
        <InputField label={t("room.guests")} type="number" min="1" max="6" value={filters.guests || 2} onChange={(event) => onChange("guests", event.target.value)} />
        <SelectField
          label={t("room.category")}
          value={filters.category || ""}
          onChange={(event) => onChange("category", event.target.value)}
          options={[
            { label: t("room.allCategories"), value: "" },
            { label: t("room.standard"), value: "Standard" },
            { label: t("room.deluxe"), value: "Deluxe" },
            { label: t("room.family"), value: "Family" },
            { label: t("room.presidential"), value: "Presidential" },
          ]}
        />
        <SelectField
          label={t("room.viewType")}
          value={filters.viewType || ""}
          onChange={(event) => onChange("viewType", event.target.value)}
          options={[
            { label: t("room.allViews"), value: "" },
            { label: t("room.godavariView"), value: "Godavari View" },
            { label: t("room.cityView"), value: "City View" },
            { label: t("room.gardenView"), value: "Garden View" },
            { label: t("room.mountainView"), value: "Mountain View" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onReset}>{t("common.reset")}</Button>
          <Button>{t("common.applyFilters")}</Button>
        </div>
      </div>
    </div>
  );
}
