import { CalendarDays, ClipboardCheck, Wrench } from "lucide-react";
import { Outlet } from "react-router-dom";
import PortalShell from "../../layout/PortalShell";

const items = [
  { label: "My Tasks", to: "/worker", icon: ClipboardCheck },
  { label: "Report Issue", to: "/worker/report-issue", icon: Wrench },
  { label: "My Schedule", to: "/worker/schedule", icon: CalendarDays },
];

export default function WorkerLayout() {
  return (
    <PortalShell title="Worker Portal" subtitle="Daily tasks, issue reporting, and shift visibility." items={items}>
      <Outlet />
    </PortalShell>
  );
}

