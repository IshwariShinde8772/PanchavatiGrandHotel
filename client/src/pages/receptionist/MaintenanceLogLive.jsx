import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const PRIORITY_OPTIONS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

export default function MaintenanceLogLive() {
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
      toast.success("Maintenance issue reported");
      setForm(EMPTY_FORM);
    },
    onError: (error) => toast.error(error.response?.data?.error || "Failed to report issue"),
  });

  const rooms = roomsResponse?.data || [];
  const issues = maintenanceResponse?.data || [];

  const handleSubmit = () => {
    if (!form.room_id || !form.title.trim()) {
      toast.error("Room and issue title are required");
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
        eyebrow="Maintenance"
        title="Capture room issues quickly"
        description="Front desk can log issues, set priority, and attach notes for the maintenance pipeline."
      />

      <div className="section-card p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            label="Room"
            value={form.room_id}
            onChange={(event) => setForm((current) => ({ ...current, room_id: event.target.value }))}
            options={[
              { label: "Select room", value: "" },
              ...rooms.map((room) => ({
                label: `${room.room_number} • ${room.name}`,
                value: String(room.id),
              })),
            ]}
          />
          <SelectField
            label="Priority"
            value={form.priority}
            onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
            options={PRIORITY_OPTIONS}
          />
          <div className="md:col-span-2">
            <InputField
              label="Issue Title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </div>
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-medium">Description</span>
          <textarea
            className="min-h-28 w-full rounded-[24px] border border-divider px-4 py-3"
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </label>
        <Button className="mt-5" onClick={handleSubmit} disabled={createMutation.isPending}>
          {createMutation.isPending ? "Reporting..." : "Report Issue"}
        </Button>
      </div>

      <div className="section-card divide-y divide-divider overflow-hidden">
        <div className="p-5">
          <h3 className="font-heading text-2xl">Recent Issues</h3>
        </div>
        {isLoading ? (
          <p className="p-5 text-mutedText">Loading maintenance history...</p>
        ) : issues.length ? (
          issues.map((item) => (
            <div key={item.id} className="grid gap-3 p-5 md:grid-cols-[0.9fr_1.1fr_0.8fr_0.8fr] md:items-center">
              <div>
                <p className="font-semibold">{item.room_number ? `Room ${item.room_number}` : "General"}</p>
                <p className="text-xs text-mutedText">{item.room_name || "No room description"}</p>
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
          <p className="p-5 text-mutedText">No maintenance issues logged yet.</p>
        )}
      </div>
    </div>
  );
}
