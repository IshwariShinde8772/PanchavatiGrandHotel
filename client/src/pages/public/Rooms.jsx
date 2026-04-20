import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import RoomFilters from "../../components/room/RoomFilters";
import RoomCard from "../../components/room/RoomCard";
import RoomCompareDrawer from "../../components/room/RoomCompareDrawer";
import SkeletonCard from "../../components/common/SkeletonCard";
import { useRooms } from "../../hooks/useRooms";

export default function Rooms() {
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    checkIn: searchParams.get("checkIn") || "",
    checkOut: searchParams.get("checkOut") || "",
    guests: searchParams.get("guests") || 2,
    category: "",
    viewType: "",
  });
  const { data, isLoading } = useRooms(filters);

  const compareRooms = useMemo(() => (data?.data || []).slice(0, 2), [data]);

  return (
    <div className="container-shell py-10">
      <PageHeader
        eyebrow="Explore Our Rooms"
        title="Rooms crafted with Nashik character"
        description="Filter by views, guest count, category, and stay window to find the right room."
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        <RoomFilters
          filters={filters}
          onChange={(key, value) => setFilters((prev) => ({ ...prev, [key]: value }))}
          onReset={() => setFilters({ checkIn: "", checkOut: "", guests: 2, category: "", viewType: "" })}
        />
        <div className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)
              : (data?.data || []).map((room) => <RoomCard key={room.id} room={room} />)}
          </div>
          <RoomCompareDrawer rooms={compareRooms} />
        </div>
      </div>
    </div>
  );
}

