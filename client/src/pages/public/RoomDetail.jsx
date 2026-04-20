import { Link, useParams } from "react-router-dom";
import { Phone } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import RoomGallery from "../../components/room/RoomGallery";
import AvailabilityCalendar from "../../components/room/AvailabilityCalendar";
import RoomAmenitiesChip from "../../components/room/RoomAmenitiesChip";
import PriceBreakdown from "../../components/room/PriceBreakdown";
import Button from "../../components/common/Button";
import RoomCard from "../../components/room/RoomCard";
import { useRoomDetail } from "../../hooks/useRooms";

export default function RoomDetail() {
  const { id } = useParams();
  const { data: room } = useRoomDetail(id);

  if (!room) return null;

  return (
    <div className="container-shell py-10">
      <PageHeader eyebrow="Home > Rooms > Detail" title={room.name} description={room.nashik_landmark} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-8">
          <RoomGallery images={room.images} />
          <div className="section-card p-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-gold px-3 py-1 text-xs font-semibold">{room.category}</span>
              <span className="rounded-full bg-saffronLight px-3 py-1 text-xs font-semibold">{room.room_number}</span>
              <span className="rounded-full bg-saffronLight px-3 py-1 text-xs font-semibold">Floor {room.floor}</span>
            </div>
            <p className="mt-4 text-mutedText">{room.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {(room.amenities || []).map((amenity) => (
                <RoomAmenitiesChip key={amenity} amenity={amenity} />
              ))}
            </div>
          </div>
          <div className="section-card p-6" id="calendar-section">
            <h3 className="font-heading text-2xl">Availability Calendar</h3>
            <div className="mt-5">
              <AvailabilityCalendar 
                basePrice={room.pricing?.pricePerNight || room.base_price} 
                bookedDates={room.booked_dates || []}
              />
            </div>
          </div>
          <div className="section-card p-6">
            <h3 className="font-heading text-2xl">Policies</h3>
            <div className="mt-4 grid gap-3 text-sm text-mutedText">
              <p>Check-in: 2:00 PM | Check-out: 11:00 AM</p>
              <p>Free cancellation if cancelled 48h before check-in</p>
              <p>Smoking: Not allowed | Pets: Not allowed</p>
              <p>Extra bed available at ₹500/night</p>
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <div className="section-card p-6">
            <p className="text-sm text-mutedText">From</p>
            <h3 className="font-heading text-4xl text-saffron">₹{room.pricing?.pricePerNight || room.base_price}</h3>
            <p className="mt-1 text-sm text-mutedText">per night • {room.availability?.available ? "Instant confirmation" : "On request"}</p>
            <div className="mt-5">
              <PriceBreakdown pricePerNight={room.pricing?.pricePerNight || room.base_price} nights={2} />
            </div>
            <div className="mt-6 grid gap-3">
              <Button as={Link} to={`/book/${room.id}`}>Book Now</Button>
              <Button variant="outline" onClick={() => document.getElementById('calendar-section')?.scrollIntoView({ behavior: 'smooth' })}>Check Availability</Button>
              <a href={`tel:${import.meta.env.VITE_HOTEL_PHONE || "+9102534447777"}`} className="inline-flex items-center justify-center gap-2 rounded-full border border-divider px-5 py-3 text-sm font-semibold text-godavari">
                <Phone size={16} /> Call to Book
              </a>
            </div>
          </div>
          <div className="section-card p-6">
            <h3 className="font-heading text-2xl">Similar Rooms</h3>
            <div className="mt-5 space-y-4">
              {(room.similar_rooms || []).map((item) => (
                <RoomCard key={item.id} room={item} compact />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
