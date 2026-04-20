import PageHeader from "../../components/common/PageHeader";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function MySchedule() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My Schedule" title="Weekly shift calendar" description="Shift timings are pulled from staff scheduling and optimized for quick mobile checks." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {days.map((day, index) => (
          <div key={day} className="section-card p-5">
            <p className="font-heading text-2xl">{day}</p>
            <p className="mt-2 text-sm text-mutedText">{index === 6 ? "Off" : "08:00 - 16:00"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
