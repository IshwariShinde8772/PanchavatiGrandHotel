import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";

export default function CheckInOut() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Check-In / Check-Out" title="Process arrivals and departures" description="Search by booking ref or room, verify ID, and confirm payment collection." />
      <div className="section-card p-6">
        <InputField label="Booking Ref" placeholder="Enter booking reference" />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button>Complete Check-In</Button>
          <Button variant="gold">Complete Check-Out</Button>
        </div>
      </div>
    </div>
  );
}
