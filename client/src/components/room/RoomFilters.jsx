import Button from "../common/Button";
import InputField from "../forms/InputField";
import SelectField from "../forms/SelectField";

export default function RoomFilters({ filters, onChange, onReset }) {
  return (
    <div className="section-card p-5">
      <div className="grid gap-4">
        <InputField label="Check-in" type="date" value={filters.checkIn || ""} onChange={(event) => onChange("checkIn", event.target.value)} />
        <InputField label="Check-out" type="date" value={filters.checkOut || ""} onChange={(event) => onChange("checkOut", event.target.value)} />
        <InputField label="Guests" type="number" min="1" max="6" value={filters.guests || 2} onChange={(event) => onChange("guests", event.target.value)} />
        <SelectField
          label="Category"
          value={filters.category || ""}
          onChange={(event) => onChange("category", event.target.value)}
          options={[
            { label: "All Categories", value: "" },
            { label: "Standard", value: "Standard" },
            { label: "Deluxe", value: "Deluxe" },
            { label: "Family", value: "Family" },
            { label: "Presidential", value: "Presidential" },
          ]}
        />
        <SelectField
          label="View Type"
          value={filters.viewType || ""}
          onChange={(event) => onChange("viewType", event.target.value)}
          options={[
            { label: "All Views", value: "" },
            { label: "Godavari View", value: "Godavari View" },
            { label: "City View", value: "City View" },
            { label: "Garden View", value: "Garden View" },
            { label: "Mountain View", value: "Mountain View" },
          ]}
        />
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={onReset}>Reset</Button>
          <Button>Apply Filters</Button>
        </div>
      </div>
    </div>
  );
}
