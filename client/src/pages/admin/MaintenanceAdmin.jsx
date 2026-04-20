import PageHeader from "../../components/common/PageHeader";

const issues = [
  ["103", "AC not cooling", "High", "In Progress"],
  ["203", "Balcony light flicker", "Medium", "Open"],
];

export default function MaintenanceAdmin() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Maintenance" title="Issue tracking and assignment" description="Assign repairs, track priority, and close issues with notes." />
      <div className="section-card divide-y divide-divider overflow-hidden">
        {issues.map(([room, title, priority, status]) => (
          <div key={title} className="grid gap-3 p-5 md:grid-cols-4">
            <p className="font-semibold">Room {room}</p>
            <p>{title}</p>
            <p>{priority}</p>
            <p>{status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

