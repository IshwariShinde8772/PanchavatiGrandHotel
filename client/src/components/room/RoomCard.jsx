import { Heart, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Badge from "../common/Badge";
import Button from "../common/Button";
import RoomAmenitiesChip from "./RoomAmenitiesChip";
import { formatCurrency } from "../../utils/formatCurrency";
import { useAuthStore } from "../../store/authStore";
import { useSaveRoom, useSavedRooms, useRemoveSavedRoom } from "../../hooks/useRooms";
import { useTranslation } from "react-i18next";
import { roomCategoryLabel } from "../../utils/i18nLabels";

export default function RoomCard({ room, compact = false, showAmenities = !compact, onSave, bookingParams = {} }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const { data: savedRooms } = useSavedRooms(Boolean(user));
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
      navigate('/login');
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
      toast.error(t("room.wishlistFailed"));
    }
  };

  const displayImage = room.images?.[0] || "/assets/images/placeholder-room.svg";
  const pricing = room.pricing || {};
  const basePrice = Number(pricing.basePrice ?? room.base_price ?? 0);
  const finalPrice = Number(pricing.finalPrice ?? pricing.pricePerNight ?? room.base_price ?? 0);
  const hasDiscount = Boolean(pricing.hasDiscount && pricing.discountAmount > 0);
  const activeOffer = pricing.offer;
  const isAvailable = room.available !== false;
  const stayParams = new URLSearchParams();
  if (bookingParams.checkIn) stayParams.set("checkIn", bookingParams.checkIn);
  if (bookingParams.checkOut) stayParams.set("checkOut", bookingParams.checkOut);
  if (bookingParams.guests) stayParams.set("guests", bookingParams.guests);
  const query = stayParams.toString();
  const detailPath = `/rooms/${room.id}${query ? `?${query}` : ""}`;
  const bookingPath = `/book/${room.id}${query ? `?${query}` : ""}`;
  const amenityItems = room.amenity_details?.length
    ? room.amenity_details
    : (room.amenities || []);
  const visibleAmenities = amenityItems.slice(0, 5);
  const remainingAmenities = Math.max(amenityItems.length - visibleAmenities.length, 0);

  const handleBookNow = () => {
    if (!isAuthenticated || !token) {
      navigate(`/login?redirectTo=${encodeURIComponent(bookingPath)}`, {
        state: { redirectTo: bookingPath },
      });
      return;
    }
    navigate(bookingPath);
  };

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
          <Badge color={room.category === "Deluxe" ? "gold" : room.category === "Presidential" ? "maroon" : "vineyard"}>{roomCategoryLabel(t, room.category)}</Badge>
          {isAvailable ? <Badge color="vineyard">{room.urgencyLabel || t("common.available")}</Badge> : <Badge color="maroon">{t("common.soldOut")}</Badge>}
          {activeOffer ? <Badge color="gold">{activeOffer.title}</Badge> : null}
        </div>
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-heading text-2xl">{room.name}</h3>
              <p className="mt-1 text-sm text-mutedText">{room.nashik_landmark}</p>
            </div>
            <div className="text-right">
              {hasDiscount ? (
                <>
                  <p className="text-xs text-mutedText line-through">{formatCurrency(basePrice)}</p>
                  <p className="text-xs font-semibold text-success">
                    {pricing.discountPct}% OFF • {t("bookingUi.saveAmount", { amount: formatCurrency(pricing.discountAmount) })}
                  </p>
                  {activeOffer ? (
                    <p className="text-xs font-semibold text-godavari">{activeOffer.room_category} offer</p>
                  ) : null}
                </>
              ) : null}
              <p className="text-lg font-semibold text-saffron">{formatCurrency(finalPrice)}</p>
              <p className="text-xs text-mutedText">{t("common.perNight")}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-sm text-mutedText">
            <Users size={16} />
            {room.capacity} {t("common.guests")}
          </div>
        </div>
        {showAmenities && amenityItems.length ? (
          <div className="mb-4">
            <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-mutedText">{t("bookingUi.amenities")}</p>
            <div className="flex flex-wrap gap-2">
              {visibleAmenities.map((amenity) => (
                <RoomAmenitiesChip
                  key={typeof amenity === "string" ? amenity : amenity.id}
                  amenity={amenity}
                />
              ))}
              {remainingAmenities ? (
                <span className="rounded-full border border-divider bg-white px-3 py-1 text-xs font-semibold text-mutedText">
                  +{t("bookingUi.more", { count: remainingAmenities })}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
        <div className="mt-auto grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            disabled={!isAvailable}
            aria-disabled={!isAvailable}
            className="h-12 w-full disabled:cursor-not-allowed disabled:opacity-45"
            onClick={() => isAvailable && navigate(detailPath)}
          >
            {t("common.viewDetails")}
          </Button>
          <Button
            type="button"
            disabled={!isAvailable}
            aria-disabled={!isAvailable}
            className="h-12 w-full disabled:cursor-not-allowed disabled:opacity-45"
            onClick={handleBookNow}
          >
            {isAvailable ? t("common.bookNow") : t("common.soldOut")}
          </Button>
        </div>
      </div>
    </article>
  );
}
