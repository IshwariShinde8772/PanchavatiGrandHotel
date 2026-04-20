import InputField from "./InputField";

export default function PhoneWithCountryCode({ label = "Phone Number", value, onChange, error }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[110px_1fr]">
      <InputField label="Code" value="+91" readOnly />
      <InputField label={label} value={value} onChange={onChange} error={error} placeholder="9876543210" />
    </div>
  );
}

