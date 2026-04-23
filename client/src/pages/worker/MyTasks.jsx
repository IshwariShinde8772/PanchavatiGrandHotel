import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import { workerAPI } from "../../api/workerAPI";

const NEXT_STATUS = {
  pending: "in_progress",
  in_progress: "done",
  done: null,
};

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function MyTasks() {
  const queryClient = useQueryClient();
  const [noteDrafts, setNoteDrafts] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ["worker-my-tasks"],
    queryFn: () => workerAPI.listMyTasks(),
  });

  const tasks = data?.data || [];

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, payload }) => workerAPI.updateMyTaskStatus(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["receptionist-cleaning-queue"] });
      toast.success("Task updated successfully");
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || "Failed to update task");
    },
  });

  const handleUpdateNotes = (task) => {
    updateTaskMutation.mutate({
      id: task.id,
      payload: { status: task.status, notes: noteDrafts[task.id] ?? task.notes ?? "" },
    });
  };

  const handleMoveForward = (task) => {
    const nextStatus = NEXT_STATUS[task.status];
    if (!nextStatus) {
      return;
    }

    updateTaskMutation.mutate({
      id: task.id,
      payload: { status: nextStatus, notes: noteDrafts[task.id] ?? task.notes ?? "" },
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Tasks Today"
        title="Assigned work and turnaround list"
        description="Track what needs attention now and update status as you move through the day."
      />

      {isLoading ? (
        <div className="section-card p-5 text-sm text-mutedText">Loading your tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="section-card p-5 text-sm text-mutedText">No tasks assigned right now.</div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => {
            const nextStatus = NEXT_STATUS[task.status];
            const notesValue = noteDrafts[task.id] ?? task.notes ?? "";

            return (
              <div key={task.id} className="section-card p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{task.title}</p>
                    <p className="text-sm text-mutedText">
                      Room: {task.room_number || "N/A"} • Type: {formatLabel(task.task_type)} • Priority: {formatLabel(task.priority)}
                    </p>
                    <p className="text-sm text-mutedText">
                      Status: <span className="font-semibold">{formatLabel(task.status)}</span>
                      {task.due_time ? ` • Due: ${new Date(task.due_time).toLocaleString()}` : ""}
                    </p>
                  </div>
                </div>

                <InputField
                  label="Notes"
                  value={notesValue}
                  onChange={(event) => setNoteDrafts((current) => ({
                    ...current,
                    [task.id]: event.target.value,
                  }))}
                  placeholder="Add handling notes (optional)"
                />

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateNotes(task)}
                    disabled={updateTaskMutation.isPending}
                  >
                    Save Notes
                  </Button>
                  {nextStatus ? (
                    <Button
                      onClick={() => handleMoveForward(task)}
                      disabled={updateTaskMutation.isPending}
                    >
                      Move to {formatLabel(nextStatus)}
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      Completed
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

