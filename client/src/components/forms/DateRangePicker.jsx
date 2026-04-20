import DatePicker from "react-datepicker";

export default function DateRangePicker({ label, startDate, endDate, onChange, minDate }) {
  return (
    <label className="block">
      {label ? <span className="mb-2 block text-sm font-medium text-darkText">{label}</span> : null}
      <DatePicker
        selected={startDate}
        onChange={onChange}
        startDate={startDate}
        endDate={endDate}
        selectsRange
        minDate={minDate}
        className="min-h-11 w-full rounded-2xl border border-divider bg-white px-4 py-3 text-sm outline-none focus:border-saffron"
        placeholderText="Select check-in and check-out"
      />
    </label>
  );
}

