import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { roomCategoryLabel } from "../../utils/i18nLabels";
import PageHeader from "../../components/common/PageHeader";
import RoomGallery from "../../components/room/RoomGallery";
import AvailabilityCalendar from "../../components/room/AvailabilityCalendar";
import RoomAmenitiesChip from "../../components/room/RoomAmenitiesChip";
import PriceBreakdown from "../../components/room/PriceBreakdown";
import Button from "../../components/common/Button";
import RoomCard from "../../components/room/RoomCard";
import { useRoomDetail } from "../../hooks/useRooms";
import { useAuthStore } from "../../store/authStore";

export default function RoomDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = searchParams.get("guests") || "";
  const { data: room } = useRoomDetail(id, {
    checkIn,
    checkOut,
    calendarStart: checkIn || undefined,
  });
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  if (!room) return null;

  const pricing = room.pricing || {};
  const basePrice = Number(pricing.basePrice ?? room.base_price ?? 0);
  const finalPrice = Number(pricing.finalPrice ?? pricing.pricePerNight ?? room.base_price ?? 0);
  const hasDiscount = Boolean(pricing.hasDiscount && pricing.discountAmount > 0);
  const activeOffer = pricing.offer;
  const stayParams = new URLSearchParams();
  if (checkIn) stayParams.set("checkIn", checkIn);
  if (checkOut) stayParams.set("checkOut", checkOut);
  if (guests) stayParams.set("guests", guests);
  const bookingPath = `/book/${room.id}${stayParams.toString() ? `?${stayParams.toString()}` : ""}`;
  const canBook = room.availability?.available !== false;
  const amenityItems = room.amenity_details?.length
    ? room.amenity_details
    : (room.amenities || []);

  const handleBookNow = () => {
    if (!canBook) return;
    if (!isAuthenticated || !token) {
      navigate(`/login?redirectTo=${encodeURIComponent(bookingPath)}`, {
        state: { redirectTo: bookingPath },
      });
      return;
    }
    navigate(bookingPath);
  };

  return (
    <div className="container-shell py-10">
      <PageHeader eyebrow={t("publicPages.detailBreadcrumb")} title={room.name} description={room.nashik_landmark} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <RoomGallery images={room.images} />
          <div className="section-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-gold px-3 py-1 text-xs font-semibold">{roomCategoryLabel(t, room.category)}</span>
              <span className="rounded-full bg-saffronLight px-3 py-1 text-xs font-semibold">{room.room_number}</span>
              <span className="rounded-full bg-saffronLight px-3 py-1 text-xs font-semibold">{t("common.floor")} {room.floor}</span>
            </div>
            <p className="mt-4 text-mutedText">{room.description}</p>
            <div className="mt-6 border-t border-divider pt-5">
              <h3 className="font-heading text-xl text-vineyard">{t("bookingUi.amenities")}</h3>
              {amenityItems.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {amenityItems.map((amenity) => (
                    <RoomAmenitiesChip
                      key={typeof amenity === "string" ? amenity : amenity.id}
                      amenity={amenity}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-mutedText">{t("ops.noAmenitiesSelected")}</p>
              )}
            </div>
          </div>
          <div className="section-card p-6" id="calendar-section">
            <h3 className="font-heading text-2xl">{t("publicPages.availabilityCalendar")}</h3>
            <div className="mt-5">
              <AvailabilityCalendar days={room.availability_calendar || []} />
            </div>
          </div>
          <div className="section-card p-6">
            <h3 className="font-heading text-2xl">{t("publicPages.policies")}</h3>
            <div className="mt-4 grid gap-3 text-sm text-mutedText">
              <p>{t("publicPages.policyCheckin")}</p>
              <p>{t("publicPages.policyCancellation")}</p>
              <p>{t("publicPages.policySmoking")}</p>
              <p>{t("publicPages.policyExtraBed")}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div className="section-card p-6">
            <p className="text-sm text-mutedText">{t("common.from")}</p>
            {hasDiscount ? (
              <p className="text-sm text-mutedText line-through">₹{basePrice}</p>
            ) : null}
            <h3 className="font-heading text-4xl text-saffron">₹{finalPrice}</h3>
            {hasDiscount ? (
              <p className="mt-1 text-sm font-semibold text-success">
                {pricing.discountPct}% OFF - Save ₹{pricing.discountAmount} per night
              </p>
            ) : null}
            {activeOffer ? (
              <div className="mt-3 rounded-lg border border-gold/40 bg-goldLight/40 px-4 py-3 text-sm">
                <p className="font-semibold text-primary">{activeOffer.title}</p>
                <p className="mt-1 text-mutedText">
                  Valid for {activeOffer.room_category} rooms until {activeOffer.end_date}.
                </p>
              </div>
            ) : null}
            <p className="mt-1 text-sm text-mutedText">
              {t("common.perNight")} - {room.availability?.available ? t("publicPages.instantConfirmation") : t("publicPages.onRequest")}
            </p>
            <div className="mt-5">
              <PriceBreakdown
                pricePerNight={finalPrice}
                basePrice={basePrice}
                finalPrice={finalPrice}
                discountPct={pricing.discountPct}
                discountAmount={pricing.discountAmount}
                nights={2}
              />
            </div>
            <div className="mt-6 grid gap-3">
              <Button
                type="button"
                disabled={!canBook}
                className="disabled:cursor-not-allowed disabled:opacity-45"
                onClick={handleBookNow}
              >
                {canBook ? t("common.bookNow") : t("common.soldOut")}
              </Button>
              <Button variant="outline" onClick={() => document.getElementById("calendar-section")?.scrollIntoView({ behavior: "smooth" })}>
                {t("common.checkAvailability")}
              </Button>
              <a href={`tel:${import.meta.env.VITE_HOTEL_PHONE || "+9102534447777"}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-divider px-5 py-3 text-sm font-semibold text-godavari">
                <Phone size={16} /> {t("common.callToBook")}
              </a>
            </div>
          </div>
          <div className="section-card p-6">
            <h3 className="font-heading text-2xl">{t("publicPages.similarRooms")}</h3>
            <div className="mt-5 space-y-4">
              {(room.similar_rooms || []).map((item) => (
                <RoomCard
                  key={item.id}
                  room={item}
                  compact
                  bookingParams={{ checkIn, checkOut, guests }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
