import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageHeader from "../../components/common/PageHeader";
import RoomFilters from "../../components/room/RoomFilters";
import RoomCard from "../../components/room/RoomCard";
import RoomCompareDrawer from "../../components/room/RoomCompareDrawer";
import SkeletonCard from "../../components/common/SkeletonCard";
import { useRooms } from "../../hooks/useRooms";

export default function Rooms() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    checkIn: searchParams.get("checkIn") || "",
    checkOut: searchParams.get("checkOut") || "",
    guests: searchParams.get("guests") || 2,
    category: "",
    viewType: "",
  });
  const { data, isLoading } = useRooms(filters);

  const compareRooms = useMemo(() => (data?.data || []).slice(0, 2), [data]);

  useEffect(() => {
    const next = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) next.set(key, value);
    });
    setSearchParams(next, { replace: true });
  }, [filters, setSearchParams]);

  return (
    <div className="container-shell py-10">
      <PageHeader
        eyebrow={t("publicPages.roomsEyebrow")}
        title={t("publicPages.roomsTitle")}
        description={t("publicPages.roomsDescription")}
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
              : (data?.data || []).map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    bookingParams={{
                      checkIn: filters.checkIn,
                      checkOut: filters.checkOut,
                      guests: filters.guests,
                    }}
                  />
                ))}
          </div>
          {!isLoading && (data?.data || []).length === 0 ? (
            <div className="section-card p-8 text-center text-mutedText">
              No rooms match the selected dates, occupancy, and filters.
            </div>
          ) : null}
          <RoomCompareDrawer rooms={compareRooms} />
        </div>
      </div>
    </div>
  );
}
