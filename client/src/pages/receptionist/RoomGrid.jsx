import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import { roomAPI } from "../../api/roomAPI";
import { roomStatusLabel } from "../../utils/i18nLabels";

const STATUS_COLORS = {
  available: "bg-green-100 text-green-700 border-green-200",
  occupied: "bg-orange-100 text-orange-700 border-orange-200",
  maintenance: "bg-red-100 text-red-700 border-red-200",
  cleaning: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

const LEGEND = [
  { label: "Available", status: "available" },
  { label: "Occupied", status: "occupied" },
  { label: "Maintenance", status: "maintenance" },
  { label: "Cleaning", status: "cleaning" },
];

export default function RoomGrid() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: res, isLoading } = useQuery({
    queryKey: ["receptionist-room-grid"],
    queryFn: () => roomAPI.getReceptionistRoomGrid(),
    refetchInterval: 20000,
    refetchIntervalInBackground: false,
  });

  const markCleanedMutation = useMutation({
    mutationFn: roomAPI.markRoomCleaned,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptionist-room-grid"] });
      toast.success(t("reception.cleanedSuccess"));
    },
    onError: () => toast.error(t("shared.actionFailed")),
  });

  const rooms = res?.data || [];
  
  // Group rooms by category
  const groupedRooms = rooms.reduce((acc, room) => {
    if (!acc[room.category]) acc[room.category] = [];
    acc[room.category].push(room);
    return acc;
  }, {});

  return (
    <div className="space-y-8 pb-12">
      <PageHeader 
        eyebrow={t("reception.roomGridEyebrow")}
        title={t("reception.roomGridTitle")}
        description={t("reception.roomGridDescription")}
      />

      <div className="flex flex-wrap gap-4 p-4 section-card">
        {LEGEND.map((item) => (
          <div key={item.status} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${STATUS_COLORS[item.status].split(' ')[0]}`}></div>
            <span className="text-xs font-bold text-mutedText uppercase tracking-wider">{roomStatusLabel(t, item.status)}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <p className="p-10 text-center text-mutedText">{t("common.loading")}</p>
      ) : (
        <div className="space-y-10">
          {Object.entries(groupedRooms).map(([category, categoryRooms]) => (
            <div key={category} className="space-y-4">
              <h3 className="font-heading text-lg font-bold text-vineyard uppercase tracking-widest pl-2 border-l-4 border-saffron">
                {category}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {categoryRooms.map((room) => (
                  <div 
                    key={room.id}
                    className={`rounded-2xl border-2 p-6 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1 ${STATUS_COLORS[room.status] || STATUS_COLORS.available}`}
                  >
                    <p className="text-2xl font-bold font-heading mb-1">{room.room_number}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">{roomStatusLabel(t, room.status)}</p>
                    {room.status === "cleaning" ? (
                      <button
                        type="button"
                        disabled={markCleanedMutation.isPending && markCleanedMutation.variables === room.id}
                        onClick={() => markCleanedMutation.mutate(room.id)}
                        className="mt-4 rounded-lg bg-white/90 px-3 py-2 text-xs font-black text-yellow-800 shadow-sm transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
                      >
                        {markCleanedMutation.isPending && markCleanedMutation.variables === room.id
                          ? t("shared.processing")
                          : t("statuses.room.markCleaned")}
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
