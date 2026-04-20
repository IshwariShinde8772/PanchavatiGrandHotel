import { useQuery } from "@tanstack/react-query";
import PageHeader from "../../components/common/PageHeader";
import { roomAPI } from "../../api/roomAPI";

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
  const { data: res, isLoading } = useQuery({
    queryKey: ["receptionist-room-grid"],
    queryFn: () => roomAPI.getReceptionistRoomGrid(),
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
        eyebrow="Room Occupancy Grid" 
        title="Live Facility Map" 
        description="Monitor current room statuses across all floors and categories." 
      />

      <div className="flex flex-wrap gap-4 p-4 section-card">
        {LEGEND.map((item) => (
          <div key={item.status} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded ${STATUS_COLORS[item.status].split(' ')[0]}`}></div>
            <span className="text-xs font-bold text-mutedText uppercase tracking-wider">{item.label}</span>
          </div>
        ))}
      </div>

      {isLoading ? (
        <p className="p-10 text-center text-mutedText">Loading room grid...</p>
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
                    className={`rounded-2xl border-2 p-6 flex flex-col items-center justify-center text-center transition-transform hover:-translate-y-1 ${STATUS_COLORS[room.status]}`}
                  >
                    <p className="text-2xl font-bold font-heading mb-1">{room.room_number}</p>
                    <p className="text-[10px] uppercase font-bold tracking-widest opacity-80">{room.status}</p>
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
