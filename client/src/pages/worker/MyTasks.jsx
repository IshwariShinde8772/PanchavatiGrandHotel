import PageHeader from "../../components/common/PageHeader";

const tasks = [
  { id: 1, room: "302", type: "cleaning", priority: "high", description: "Reset family suite after departure" },
  { id: 2, room: "401", type: "inspection", priority: "normal", description: "Check minibar and welcome hamper" },
];

export default function MyTasks() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My Tasks Today" title="Assigned work and turnaround list" description="Track what needs attention now and update status as you move through the day." />
      <div className="space-y-4">
        {tasks.map((task) => (
          <div key={task.id} className="section-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Room {task.room} • {task.type}</p>
                <p className="text-sm text-mutedText">{task.description}</p>
              </div>
              <span className="rounded-full bg-goldLight px-3 py-1 text-xs font-semibold">{task.priority}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

