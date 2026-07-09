import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { workerAPI } from "../../api/workerAPI";
import { roomAPI } from "../../api/roomAPI";

export default function ReportIssue() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    room_id: "",
    room_number: "",
    title: "",
    description: "",
    priority: "medium",
  });

  const { data: roomsResponse } = useQuery({
    queryKey: ["worker-room-options"],
    queryFn: () => roomAPI.getRooms({ limit: 200 }),
  });

  const roomOptions = [
    { label: `${t("ops.selectRoom")} (${t("shared.optional")})`, value: "" },
    ...(roomsResponse?.data || []).map((room) => ({
      label: `${room.room_number} - ${room.name}`,
      value: String(room.id),
    })),
  ];

  const reportIssueMutation = useMutation({
    mutationFn: workerAPI.reportIssue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-my-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["receptionist-maintenance"] });
      toast.success(t("shared.actionCompleted"));
      setForm({
        room_id: "",
        room_number: "",
        title: "",
        description: "",
        priority: "medium",
      });
    },
    onError: (error) => {
      toast.error(t("shared.actionFailed"));
    },
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.title.trim()) {
      toast.error(t("shared.required"));
      return;
    }

    if (!form.description.trim()) {
      toast.error(t("shared.required"));
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
    };

    if (form.room_id) {
      payload.room_id = Number(form.room_id);
    } else if (form.room_number.trim()) {
      payload.room_number = form.room_number.trim();
    }

    reportIssueMutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("ops.reportIssue")}
        title={t("ops.reportIssueTitle")}
        description={t("ops.reportIssueDescription")}
      />

      <form onSubmit={handleSubmit} className="section-card p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label={t("ops.roomSelection")}
            value={form.room_id}
            onChange={(event) => setForm((current) => ({
              ...current,
              room_id: event.target.value,
            }))}
            options={roomOptions}
          />
          <InputField
            label={t("ops.roomNumberOptional")}
            value={form.room_number}
            onChange={(event) => setForm((current) => ({
              ...current,
              room_number: event.target.value,
            }))}
            placeholder="e.g. 302"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InputField
            label={t("ops.issueTitle")}
            value={form.title}
            onChange={(event) => setForm((current) => ({
              ...current,
              title: event.target.value,
            }))}
            required
          />
          <SelectField
            label={t("ops.priority")}
            value={form.priority}
            onChange={(event) => setForm((current) => ({
              ...current,
              priority: event.target.value,
            }))}
            options={["medium", "low", "high", "urgent"].map((value) => ({ label: t(`ops.${value}`), value }))}
          />
        </div>

        <label className="block">
          <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "#526359" }}>
            {t("ops.description")}
          </span>
          <textarea
            value={form.description}
            onChange={(event) => setForm((current) => ({
              ...current,
              description: event.target.value,
            }))}
            required
            className="min-h-28 w-full rounded-2xl border border-divider px-4 py-3 text-sm outline-none focus:border-saffron"
            placeholder={t("ops.description")}
          />
        </label>

        <Button type="submit" disabled={reportIssueMutation.isPending}>
          {reportIssueMutation.isPending ? t("common.submitting") : t("ops.submitIssue")}
        </Button>
      </form>
    </div>
  );
}
