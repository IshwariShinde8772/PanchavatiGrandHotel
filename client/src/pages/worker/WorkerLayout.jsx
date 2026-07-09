import { CalendarDays, ClipboardCheck, Wrench } from "lucide-react";
import { Outlet } from "react-router-dom";
import PortalShell from "../../layout/PortalShell";
import { useTranslation } from "react-i18next";

const items = [
  { labelKey: "ops.myTasks", to: "/worker", icon: ClipboardCheck },
  { labelKey: "ops.reportIssue", to: "/worker/report-issue", icon: Wrench },
  { labelKey: "ops.mySchedule", to: "/worker/schedule", icon: CalendarDays },
];

export default function WorkerLayout() {
  const { t } = useTranslation();
  return (
    <PortalShell title={t("ops.workerPortal")} subtitle={t("ops.workerSubtitle")} items={items.map((item) => ({ ...item, label: t(item.labelKey) }))}>
      <Outlet />
    </PortalShell>
  );
}

