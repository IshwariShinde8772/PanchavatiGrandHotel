import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";

export default function Settings() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Settings" title="Hotel identity and billing rules" description="Configure GST, address, cancellation copy, UPI, bank details, and operational timings." />
      <div className="section-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Hotel Name" value="Panchavati Grand" readOnly />
          <InputField label="GST %" value="12" readOnly />
          <InputField label="Phone" value="+91-0253-4447777" readOnly />
          <InputField label="UPI ID" value="panchavatgrand@okaxis" readOnly />
        </div>
        <Button className="mt-6">Save Settings</Button>
      </div>
    </div>
  );
}

