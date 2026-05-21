import PageHeader from "../../components/common/PageHeader";
import RoomCard from "../../components/room/RoomCard";
import { useSavedRooms } from "../../hooks/useRooms";
import { useTranslation } from "react-i18next";

export default function MyRooms() {
  const { t } = useTranslation();
  const { data } = useSavedRooms();
  const rooms = data?.data || [];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t("nav.myRooms")} title={t("customer.savedTitle")} description={t("customer.savedDescription")} />
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((item) => (
          <RoomCard key={item.id || item.room?.id} room={item.room || item} />
        ))}
      </div>
    </div>
  );
}
