import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import PageHeader from "../../components/common/PageHeader";
import Button from "../../components/common/Button";
import InputField from "../../components/forms/InputField";
import SelectField from "../../components/forms/SelectField";
import { maintenanceAPI } from "../../api/maintenanceAPI";
import { roomAPI } from "../../api/roomAPI";

const EMPTY_FORM = {
  room_id: "",
  title: "",
  description: "",
  priority: "medium",
};

export default function MaintenanceLogLive() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: roomsResponse } = useQuery({
    queryKey: ["receptionist-room-grid"],
    queryFn: roomAPI.getReceptionistRoomGrid,
  });

  const { data: maintenanceResponse, isLoading } = useQuery({
    queryKey: ["receptionist-maintenance"],
    queryFn: maintenanceAPI.listReceptionist,
  });

  const createMutation = useMutation({
    mutationFn: maintenanceAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-maintenance"] });
      queryClient.invalidateQueries({ queryKey: ["receptionist-room-grid"] });
      toast.success(t("shared.actionCompleted"));
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const rooms = roomsResponse?.data || [];
  const issues = maintenanceResponse?.data || [];

  const handleSubmit = () => {
    if (!form.room_id || !form.title.trim()) {
      toast.error(t("ops.completeFields"));
      return;
    }

    createMutation.mutate({
      room_id: Number(form.room_id),
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("layout.maintenance")}
        title={t("ops.maintenanceTitle")}
        description={t("ops.maintenanceDescription")}
      />

      <div className="section-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label={t("ops.room")}
            value={form.room_id}
            onChange={(event) => setForm((current) => ({ ...current, room_id: event.target.value }))}
            options={[
              { label: t("ops.selectRoom"), value: "" },
              ...rooms.map((room) => ({
                label: `${room.room_number} • ${room.name}`,
                value: String(room.id),
              })),
            ]}
          />
          <SelectField
            label={t("ops.priority")}
            value={form.priority}
            onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
            options={["low", "medium", "high", "urgent"].map((value) => ({ label: t(`ops.${value}`), value }))}
          />
          <div className="md:col-span-2">
            <InputField
              label={t("ops.issueTitle")}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium">{t("ops.description")}</span>
          <textarea
            className="min-h-28 w-full rounded-[24px] border border-divider px-4 py-3"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </label>
        <Button className="mt-5" onClick={handleSubmit} disabled={createMutation.isPending}>
          {createMutation.isPending ? t("ops.reporting") : t("ops.reportIssue")}
        </Button>
      </div>

      <div className="section-card divide-y divide-divider overflow-hidden">
        <div className="p-5">
          <h3 className="font-heading text-2xl">{t("ops.recentIssues")}</h3>
        </div>
        {isLoading ? (
          <p className="p-5 text-mutedText">{t("ops.loadingMaintenance")}</p>
        ) : issues.length ? (
          issues.map((item) => (
            <div key={item.id} className="grid gap-3 p-5 md:grid-cols-[0.9fr_1.1fr_0.8fr_0.8fr] md:items-center">
              <div>
                <p className="font-semibold">{item.room_number ? `${t("ops.room")} ${item.room_number}` : t("ops.generalArea")}</p>
                <p className="text-xs text-mutedText">{item.room_name || t("ops.noRoomDescription")}</p>
              </div>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="text-sm text-mutedText">{item.description}</p>
              </div>
              <p className="text-sm capitalize text-mutedText">{item.priority}</p>
              <p className="text-sm capitalize text-mutedText">{item.status.replace("_", " ")}</p>
            </div>
          ))
        ) : (
          <p className="p-5 text-mutedText">{t("ops.noMaintenance")}</p>
        )}
      </div>
    </div>
  );
}
