import { Heart, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import Badge from "../common/Badge";
import Button from "../common/Button";
import RoomAmenitiesChip from "./RoomAmenitiesChip";
import { formatCurrency } from "../../utils/formatCurrency";
import { useAuthStore } from "../../store/authStore";
import { useSaveRoom, useSavedRooms, useRemoveSavedRoom } from "../../hooks/useRooms";

export default function RoomCard({ room, compact = false, onSave }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { data: savedRooms } = useSavedRooms();
  const saveRoomMutation = useSaveRoom();
  const removeRoomMutation = useRemoveSavedRoom();
  
  const isSaved = savedRooms?.data?.some(saved => saved.room_id === room.id) || false;
  const [liked, setLiked] = useState(isSaved);

  useEffect(() => {
    setLiked(isSaved);
  }, [isSaved]);

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      // Store the room ID to save after login
      sessionStorage.setItem('pendingSaveRoom', room.id.toString());
      toast.error(t("room.loginWishlist"));
      navigate('/auth/login');
      return;
    }

    try {
      if (liked) {
        // Remove from wishlist
        await removeRoomMutation.mutateAsync(room.id);
        setLiked(false);
        toast.success(t("room.removedWishlist"));
      } else {
        // Add to wishlist
        await saveRoomMutation.mutateAsync(room.id);
        setLiked(true);
        toast.success(t("room.addedWishlist"));
      }
      onSave?.(room.id);
    } catch (error) {
      toast.error(error.response?.data?.error || t("room.wishlistFailed"));
    }
  };

  const displayImage = room.images?.[0] || "/assets/images/placeholder-room.svg";

  return (
    <article className="section-card overflow-hidden h-full flex flex-col">
      <div className="relative">
        <img src={displayImage} alt={room.name} className={compact ? "h-52 w-full object-cover" : "h-60 w-full object-cover"} />
        {user && (
          <button className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-maroon shadow transition-transform hover:scale-110 active:scale-95 z-20" onClick={handleLike}>
            <Heart size={16} fill={liked ? "#DC2626" : "none"} color={liked ? "#DC2626" : "currentColor"} />
          </button>
        )}
      </div>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={room.category === "Deluxe" ? "gold" : room.category === "Presidential" ? "maroon" : "vineyard"}>{room.category}</Badge>
          {room.available ? <Badge color="vineyard">{room.urgencyLabel || t("common.available")}</Badge> : <Badge color="maroon">{t("common.soldOut")}</Badge>}
        </div>
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-2xl">{room.name}</h3>
              <p className="mt-1 text-sm text-mutedText">{room.nashik_landmark}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-saffron">{formatCurrency(room.pricing?.pricePerNight || room.base_price)}</p>
              <p className="text-xs text-mutedText">{t("common.perNight")}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-mutedText">
            <Users size={16} />
            {room.capacity} {t("common.guests")}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {(room.amenities || []).slice(0, 5).map((amenity) => (
            <RoomAmenitiesChip key={amenity} amenity={amenity} />
          ))}
        </div>
        <div className="mt-auto grid gap-3 sm:grid-cols-2">
          <Button as={Link} to={`/rooms/${room.id}`} variant="outline" className="w-full h-12 flex items-center justify-center">{t("common.viewDetails")}</Button>
          <Button as={Link} to={`/book/${room.id}`} className="w-full h-12 flex items-center justify-center">{t("common.bookNow")}</Button>
        </div>
      </div>
    </article>
  );
}
