export default function AlertsPanel({ alerts = {} }) {
  return (
    <div className="section-card p-5">
      <h3 className="font-heading text-2xl">Alerts</h3>
      <div className="mt-4 space-y-3">
        <div className="rounded-2xl bg-goldLight p-4 text-sm">Low inventory items: {alerts.low_inventory?.length || alerts.low_inventory || 0}</div>
        <div className="rounded-2xl bg-saffronLight p-4 text-sm">Open maintenance issues: {alerts.open_maintenance || 0}</div>
        <div className="rounded-2xl bg-white p-4 text-sm">Pending feedback approvals: {alerts.pending_feedback || 0}</div>
        <div className="rounded-2xl bg-godavari/10 p-4 text-sm">Pay-at-hotel arrivals today: {alerts.pay_at_hotel_today || 0}</div>
      </div>
    </div>
  );
}

