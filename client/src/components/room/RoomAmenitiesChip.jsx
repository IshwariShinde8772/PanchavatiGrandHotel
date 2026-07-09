import {
  Accessibility,
  Car,
  Droplets,
  Eye,
  Refrigerator,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Tv,
  Wifi,
} from "lucide-react";

function amenityIcon(amenity) {
  const value = `${amenity?.icon || ""} ${amenity?.name || amenity || ""}`.toLocaleLowerCase();
  if (value.includes("wifi") || value.includes("wi-fi")) return Wifi;
  if (value.includes("air conditioning") || /\bac\b/.test(value)) return Snowflake;
  if (value.includes("tv") || value.includes("entertainment")) return Tv;
  if (value.includes("parking") || value.includes("car")) return Car;
  if (value.includes("water") || value.includes("shower") || value.includes("bath")) return Droplets;
  if (value.includes("fridge") || value.includes("refrigerator")) return Refrigerator;
  if (value.includes("balcony") || value.includes("view")) return Eye;
  if (value.includes("safety") || value.includes("secure")) return ShieldCheck;
  if (value.includes("accessib")) return Accessibility;
  return Sparkles;
}

export default function RoomAmenitiesChip({ amenity }) {
  const label = typeof amenity === "string" ? amenity : amenity?.name;
  const Icon = amenityIcon(amenity);
  if (!label) return null;

  return (
    <span
      title={typeof amenity === "object" ? amenity.category : undefined}
      className="inline-flex items-center gap-1.5 rounded-full bg-saffronLight px-3 py-1 text-xs font-medium text-saffron"
    >
      <Icon size={13} aria-hidden="true" />
      {label}
    </span>
  );
}

