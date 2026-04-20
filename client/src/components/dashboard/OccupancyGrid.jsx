const statusColors = {
  available: "bg-vineyard",
  occupied: "bg-saffron",
  cleaning: "bg-gold",
  maintenance: "bg-slate-500",
};

export default function OccupancyGrid({ occupancy = {} }) {
  return (
    <div className="section-card p-5">
      <h3 className="font-heading text-2xl">Occupancy Snapshot</h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {Object.entries(occupancy).map(([status, value]) => (
          <div key={status} className="rounded-2xl border border-divider p-4">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${statusColors[status]}`} />
              <span className="capitalize">{status}</span>
            </div>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

