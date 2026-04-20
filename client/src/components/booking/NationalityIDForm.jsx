import FileUpload from "../forms/FileUpload";
import InputField from "../forms/InputField";
import SelectField from "../forms/SelectField";

export default function NationalityIDForm({ form, setForm }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <InputField label="Nationality" value={form.nationality || ""} onChange={(event) => setForm({ ...form, nationality: event.target.value })} />
        <SelectField
          label="ID Type"
          value={form.id_type || "national_id"}
          onChange={(event) => setForm({ ...form, id_type: event.target.value })}
          options={[
            { label: "Aadhaar / National ID", value: "national_id" },
            { label: "Passport", value: "passport" },
            { label: "Driving License", value: "driving_license" },
            { label: "Other", value: "other" },
          ]}
        />
        <InputField label="ID Number" value={form.id_number || ""} onChange={(event) => setForm({ ...form, id_number: event.target.value })} />
        <InputField label="ID Expiry Date" type="date" value={form.id_expiry || ""} onChange={(event) => setForm({ ...form, id_expiry: event.target.value })} />
      </div>
      <FileUpload label="Upload Document" onChange={(event) => setForm({ ...form, id_doc: event.target.files?.[0]?.name })} />
      <div className="rounded-[24px] bg-terracotta/10 p-4 text-sm text-mutedText">
        Your ID is required at hotel check-in as per Government of India regulations. It is stored securely and used only for stay verification.
      </div>
    </div>
  );
}

