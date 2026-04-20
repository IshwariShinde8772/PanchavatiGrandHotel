import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";

export default function ReportIssue() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Report an Issue" title="Send maintenance updates from the floor" description="Create a maintenance ticket with room number, title, and priority." />
      <div className="section-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Room Number" />
          <InputField label="Issue Title" />
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium">Description</span>
          <textarea className="min-h-28 w-full rounded-[24px] border border-divider px-4 py-3" />
        </label>
        <Button className="mt-5">Submit Issue</Button>
      </div>
    </div>
  );
}

