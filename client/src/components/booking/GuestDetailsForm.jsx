import InputField from "../forms/InputField";
import PhoneWithCountryCode from "../forms/PhoneWithCountryCode";

export default function GuestDetailsForm({ form, setForm }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <InputField label="Full Name" value={form.full_name || ""} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
      <InputField label="Email Address" type="email" value={form.email || ""} onChange={(event) => setForm({ ...form, email: event.target.value })} />
      <div className="md:col-span-2">
        <PhoneWithCountryCode value={form.phone || ""} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
      </div>
      <InputField label="Address" className="md:col-span-2" value={form.address || ""} onChange={(event) => setForm({ ...form, address: event.target.value })} />
    </div>
  );
}

