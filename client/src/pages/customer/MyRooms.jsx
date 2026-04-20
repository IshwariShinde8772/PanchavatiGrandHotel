import PageHeader from "../../components/common/PageHeader";
import RoomCard from "../../components/room/RoomCard";
import { useSavedRooms } from "../../hooks/useRooms";

export default function MyRooms() {
  const { data } = useSavedRooms();
  const rooms = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="My Rooms" title="Saved room wishlist" description="Rooms you shortlisted for a future Nashik visit." />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((item) => (
          <RoomCard key={item.id || item.room?.id} room={item.room || item} />
        ))}
      </div>
    </div>
  );
}

