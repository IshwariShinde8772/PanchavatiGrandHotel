import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import { workerAPI } from "../../api/workerAPI";

const WEEK_DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function MySchedule() {
  const { data, isLoading } = useQuery({
    queryKey: ["worker-my-schedule"],
    queryFn: () => workerAPI.getMySchedule(),
  });

  const schedule = data?.data || {};

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Schedule"
        title="Weekly shift calendar"
        description="Shift timings are pulled from your staff schedule for quick checks during your shift."
      />

      {isLoading ? (
        <div className="section-card p-5 text-sm text-mutedText">Loading schedule...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {WEEK_DAYS.map((day) => (
            <div key={day.key} className="section-card p-5">
              <p className="font-heading text-2xl">{day.label}</p>
              <p className="mt-2 text-sm text-mutedText">{schedule[day.key] || "Off"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

