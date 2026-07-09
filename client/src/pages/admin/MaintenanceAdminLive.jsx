import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import SelectField from "../../components/forms/SelectField";
import { maintenanceAPI } from "../../api/maintenanceAPI";
import { staffAPI } from "../../api/staffAPI";

const STATUS_LABELS = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const PRIORITY_STYLES = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

export default function MaintenanceAdminLive() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [assignmentById, setAssignmentById] = useState({});

  const { data: maintenanceResponse, isLoading } = useQuery({
    queryKey: ["admin-maintenance"],
    queryFn: maintenanceAPI.listAdmin,
  });

  const { data: staffResponse } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: staffAPI.list,
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, payload }) => maintenanceAPI.assign(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["receptionist-room-grid"] });
      toast.success(t("shared.actionCompleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, payload }) => maintenanceAPI.resolve(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["receptionist-room-grid"] });
      toast.success(t("shared.actionCompleted"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const items = maintenanceResponse?.data || [];
  const staffOptions = (staffResponse?.data || [])
    .filter((member) => member.is_active)
    .map((member) => ({
      label: `${member.full_name} (${member.role})`,
      value: String(member.id),
    }));

  const handleAssign = (item) => {
    const assignedStaffId = assignmentById[item.id];
    if (!assignedStaffId) {
      toast.error(t("ops.selectStaff"));
      return;
    }

    assignMutation.mutate({
      id: item.id,
      payload: { assigned_to_staff_id: Number(assignedStaffId) },
    });
  };

  const handleResolve = (item) => {
    const resolutionNote = window.prompt("Add a short resolution note", item.resolution_note || "");
    if (resolutionNote === null) {
      return;
    }

    resolveMutation.mutate({
      id: item.id,
      payload: { resolution_note: resolutionNote },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("layout.maintenance")}
        title={t("ops.maintenanceAdminTitle")}
        description={t("ops.maintenanceAdminDescription")}
      />

      {isLoading ? (
        <p className="p-6 text-mutedText">{t("ops.loadingMaintenance")}</p>
      ) : (
        <div className="section-card divide-y divide-divider overflow-hidden">
          {items.map((item) => (
            <div key={item.id} className="grid gap-4 p-5 lg:grid-cols-[1.2fr_0.9fr_1fr_1.4fr_220px] lg:items-center">
              <div>
                <p className="font-semibold">
                  {item.room_number ? `${t("ops.room")} ${item.room_number}` : t("ops.generalArea")}
                </p>
                <p className="text-sm text-mutedText">{item.room_name || item.title}</p>
              </div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-xs text-mutedText">{item.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${PRIORITY_STYLES[item.priority] || PRIORITY_STYLES.medium}`}>
                  {(item.priority || "medium").toUpperCase()}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-mutedText">Reported by: {item.reported_by_name || "Unknown"}</p>
                <p className="text-sm text-mutedText">Assigned to: {item.assigned_to_name || "Unassigned"}</p>
                {item.resolution_note ? <p className="text-sm text-mutedText">Resolution: {item.resolution_note}</p> : null}
              </div>
              <div className="space-y-2">
                {item.status !== "resolved" ? (
                  <>
                    <SelectField
                      label={t("ops.assignTo")}
                      value={assignmentById[item.id] || String(item.assigned_to_staff_id || "")}
                      onChange={(event) => setAssignmentById((current) => ({ ...current, [item.id]: event.target.value }))}
                      options={[{ label: t("ops.selectStaff"), value: "" }, ...staffOptions]}
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => handleAssign(item)}>{t("ops.assign")}</Button>
                      <Button onClick={() => handleResolve(item)}>{t("ops.resolve")}</Button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-green-50 px-4 py-3 text-sm text-green-700">{t("ops.issueCompleted")}</div>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 ? <p className="p-6 text-center text-mutedText">{t("ops.noMaintenanceIssues")}</p> : null}
        </div>
      )}
    </div>
  );
}
