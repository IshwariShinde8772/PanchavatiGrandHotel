import { useTranslation } from "react-i18next";
import { roomCategoryLabel, roomStatusLabel } from "../../utils/i18nLabels";

const roomColors = {
  available: "#0A4D34",  // Forest Green
  occupied: "#c2410c",   // Orange/Rust
  cleaning: "#eab308",   // Yellow/Gold
  maintenance: "#64748b", // Slate
};

export default function RoomStatusGrid({ rooms = [] }) {
  const { t } = useTranslation();
  return (
    <div className="section-card p-5">
      <h3 className="font-heading text-2xl">{t("admin.roomStatusGrid")}</h3>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {rooms.map((room) => (
          <div 
            key={room.id} 
            className="rounded-2xl p-4 text-white hover:-translate-y-1 transition-transform cursor-pointer shadow-sm"
            style={{ backgroundColor: roomColors[room.status] || "#0A4D34" }}
          >
            <p className="font-heading text-2xl font-bold">{room.room_number}</p>
            <p className="text-sm font-medium opacity-90">{roomCategoryLabel(t, room.category)}</p>
            <p className="mt-3 text-[10px] uppercase font-bold tracking-[0.15em] opacity-80">{roomStatusLabel(t, room.status)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

