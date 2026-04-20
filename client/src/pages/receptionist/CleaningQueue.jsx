import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import SelectField from "../../components/forms/SelectField";
import { taskAPI } from "../../api/taskAPI";

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Pending", value: "pending" },
  { label: "In Progress", value: "in_progress" },
  { label: "Done", value: "done" },
];

const statusLabel = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
};

export default function CleaningQueue() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [draftAssignments, setDraftAssignments] = useState({});

  const { data: tasksResponse, isLoading } = useQuery({
    queryKey: ["receptionist-cleaning-queue", statusFilter],
    queryFn: () => taskAPI.listReceptionTasks({
      task_type: "cleaning",
      ...(statusFilter ? { status: statusFilter } : {}),
    }),
  });

  const { data: staffResponse } = useQuery({
    queryKey: ["receptionist-assignable-staff"],
    queryFn: () => taskAPI.listAssignableStaff({ roles: "housekeeping,receptionist,manager" }),
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, staff_id }) => taskAPI.assignReceptionTask(id, { staff_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-cleaning-queue"] });
      toast.success("Cleaning task assigned");
    },
    onError: (error) => toast.error(error.response?.data?.error || "Failed to assign task"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => taskAPI.updateReceptionTaskStatus(id, { status }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-cleaning-queue"] });
      toast.success(variables.status === "done" ? "Room marked ready" : "Task status updated");
    },
    onError: (error) => toast.error(error.response?.data?.error || "Failed to update task"),
  });

  const tasks = tasksResponse?.data || [];
  const staff = staffResponse?.data || [];

  const assignOptions = [
    { label: "Select staff", value: "" },
    ...staff.map((member) => ({
      label: `${member.full_name} (${member.role})`,
      value: String(member.id),
    })),
  ];

  const handleAssign = (task) => {
    const staffId = draftAssignments[task.id] || String(task.assigned_to || "");
    if (!staffId) {
      toast.error("Choose a staff member first");
      return;
    }

    assignMutation.mutate({ id: task.id, staff_id: Number(staffId) });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cleaning Queue"
        title="Allocate and close room turnaround tasks"
        description="Every checkout now lands here first. Reception can assign housekeeping and mark a room ready once cleaning is done."
      />

      <div className="section-card p-6 md:max-w-sm">
        <SelectField
          label="Filter Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          options={statusOptions}
        />
      </div>

      <div className="section-card divide-y divide-divider overflow-hidden">
        {isLoading ? (
          <p className="p-5 text-mutedText">Loading cleaning queue...</p>
        ) : tasks.length ? (
          tasks.map((task) => (
            <div key={task.id} className="space-y-4 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="font-semibold">{task.title}</p>
                  <p className="text-sm text-mutedText">
                    {task.room_number ? `Room ${task.room_number}` : "General task"}
                    {task.room_name ? ` • ${task.room_name}` : ""}
                    {task.room_status ? ` • Room status: ${task.room_status}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-mutedText">{statusLabel[task.status] || task.status}</p>
              </div>

              <p className="text-sm text-mutedText">{task.description}</p>

              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-end">
                <SelectField
                  label="Assign To"
                  value={draftAssignments[task.id] || String(task.assigned_to || "")}
                  onChange={(event) => setDraftAssignments((current) => ({
                    ...current,
                    [task.id]: event.target.value,
                  }))}
                  options={assignOptions}
                />
                <Button
                  variant="outline"
                  onClick={() => handleAssign(task)}
                  disabled={assignMutation.isPending}
                >
                  Assign
                </Button>
                <Button
                  variant="outline"
                  onClick={() => statusMutation.mutate({ id: task.id, status: "in_progress" })}
                  disabled={statusMutation.isPending || task.status === "in_progress"}
                >
                  Start
                </Button>
                <Button
                  onClick={() => statusMutation.mutate({ id: task.id, status: "done" })}
                  disabled={statusMutation.isPending || task.status === "done"}
                >
                  Mark Ready
                </Button>
              </div>

              <p className="text-xs text-mutedText">
                Current assignee: {task.assigned_to_name || "Reception desk"}
              </p>
            </div>
          ))
        ) : (
          <p className="p-5 text-mutedText">No cleaning tasks found for the selected filter.</p>
        )}
      </div>
    </div>
  );
}
