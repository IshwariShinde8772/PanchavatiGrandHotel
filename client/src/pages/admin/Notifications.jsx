import PageHeader from "../../components/common/PageHeader";

const notifications = [
  ["Low stock alert", "Soap is below reorder level"],
  ["Maintenance alert", "High-priority AC issue in room 103"],
  ["Pay-at-hotel reminder", "Two arrivals today require payment collection"],
];

export default function Notifications() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Notifications" title="Operational alerts and reminders" description="A central feed for system, inventory, maintenance, and booking notifications." />
      <div className="section-card divide-y divide-divider overflow-hidden">
        {notifications.map(([title, body]) => (
          <div key={title} className="p-5">
            <p className="font-semibold">{title}</p>
            <p className="mt-2 text-sm text-mutedText">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
