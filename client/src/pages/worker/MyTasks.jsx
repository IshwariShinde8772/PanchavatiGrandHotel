import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      toast.success(t("ops.updated"));
    },
    onError: (error) => {
      toast.error(t("shared.actionFailed"));
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
        eyebrow={t("ops.myTasksToday")}
        title={t("ops.assignedWork")}
        description={t("ops.assignedWorkDescription")}
      />

      {isLoading ? (
        <div className="section-card p-5 text-sm text-mutedText">{t("ops.loadingTasks")}</div>
      ) : tasks.length === 0 ? (
        <div className="section-card p-5 text-sm text-mutedText">{t("ops.noTasks")}</div>
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
                      {t("ops.room")}: {task.room_number || t("shared.notAvailable")} • {t("ops.taskType")}: {formatLabel(task.task_type)} • {t("ops.priority")}: {formatLabel(task.priority)}
                    </p>
                    <p className="text-sm text-mutedText">
                      {t("common.status")}: <span className="font-semibold">{formatLabel(task.status)}</span>
                      {task.due_time ? ` • ${t("ops.due")}: ${new Date(task.due_time).toLocaleString()}` : ""}
                    </p>
                  </div>
                </div>

                <InputField
                  label={t("shared.notes")}
                  value={notesValue}
                  onChange={(event) => setNoteDrafts((current) => ({
                    ...current,
                    [task.id]: event.target.value,
                  }))}
                  placeholder={`${t("shared.notes")} (${t("shared.optional")})`}
                />

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateNotes(task)}
                    disabled={updateTaskMutation.isPending}
                  >
                    {t("ops.saveNotes")}
                  </Button>
                  {nextStatus ? (
                    <Button
                      onClick={() => handleMoveForward(task)}
                      disabled={updateTaskMutation.isPending}
                    >
                      {t("ops.moveTo", { status: formatLabel(nextStatus) })}
                    </Button>
                  ) : (
                    <Button variant="outline" disabled>
                      {t("ops.taskCompleted")}
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
