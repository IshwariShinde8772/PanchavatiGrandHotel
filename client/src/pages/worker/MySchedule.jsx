import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import { workerAPI } from "../../api/workerAPI";
import { useTranslation } from "react-i18next";

const WEEK_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function MySchedule() {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["worker-my-schedule"],
    queryFn: () => workerAPI.getMySchedule(),
  });

  const schedule = data?.data || {};

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("ops.mySchedule")}
        title={t("ops.weeklyCalendar")}
        description={t("ops.scheduleDescription")}
      />

      {isLoading ? (
        <div className="section-card p-5 text-sm text-mutedText">{t("ops.loadingSchedule")}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="section-card p-5">
              <p className="font-heading text-2xl">{t(`ops.${day}`)}</p>
              <p className="mt-2 text-sm text-mutedText">{schedule[day] || t("ops.offDuty")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
