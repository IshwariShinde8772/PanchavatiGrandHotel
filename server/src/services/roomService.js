const { Op } = require("sequelize");
const { Room, Booking } = require("../../models");
const env = require("../config/env");
const { isDateInRange } = require("../utils/dateHelpers");

function getPublicBackendUrl() {
  return String(env.backendUrl || "")
    .trim()
    .replace(/\/+$/g, "")
    .replace(/\/api$/i, "");
}

function normalizeStringArray(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch (error) {
      return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function resolveRoomAssetUrl(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }

  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith("data:")) {
    return normalized;
  }

  if (normalized.startsWith("/uploads/")) {
    const backendUrl = getPublicBackendUrl();
    return backendUrl ? `${backendUrl}${normalized}` : normalized;
  }

  if (normalized.startsWith("uploads/")) {
    const backendUrl = getPublicBackendUrl();
    return backendUrl ? `${backendUrl}/${normalized}` : normalized;
  }

  return normalized;
}

function normalizeRoomRecord(room) {
  const plain = typeof room?.get === "function" ? room.get({ plain: true }) : { ...room };

  return {
    ...plain,
    amenities: normalizeStringArray(plain.amenities),
    images: normalizeStringArray(plain.images).map(resolveRoomAssetUrl).filter(Boolean),
  };
}

function calculateEffectivePrice(room, checkIn) {
  const basePrice = Number(room.base_price);
  const seasonalPrice = room.seasonal_price ? Number(room.seasonal_price) : null;
  const discountPct = room.discount_pct ? Number(room.discount_pct) : null;

  if (checkIn && seasonalPrice && room.seasonal_start && room.seasonal_end
    && isDateInRange(checkIn, room.seasonal_start, room.seasonal_end)) {
    return {
      pricePerNight: seasonalPrice,
      priceType: "seasonal",
      savings: 0,
    };
  }

  if (checkIn && discountPct && room.discount_start && room.discount_end
    && isDateInRange(checkIn, room.discount_start, room.discount_end)) {
    const discountedPrice = Number((basePrice * (1 - discountPct / 100)).toFixed(2));
    return {
      pricePerNight: discountedPrice,
      priceType: "discounted",
      savings: Number((basePrice - discountedPrice).toFixed(2)),
    };
  }

  return {
    pricePerNight: basePrice,
    priceType: "base",
    savings: 0,
  };
}

async function countOverlappingBookings({ roomId, checkIn, checkOut, excludeBookingId, transaction }) {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const where = {
    room_id: roomId,
    status: {
      [Op.in]: ["confirmed", "checked_in"],
    },
    check_out: { [Op.gt]: checkIn },
    check_in: { [Op.lt]: checkOut },
  };

  if (excludeBookingId) {
    where.id = { [Op.ne]: excludeBookingId };
  }

  return Booking.count({ where, transaction });
}

async function getAvailabilityForRoom(room, checkIn, checkOut) {
  const overlapCount = await countOverlappingBookings({
    roomId: room.id,
    checkIn,
    checkOut,
  });
  const availableCount = Math.max(Number(room.total_units) - overlapCount, 0);

  return {
    overlapCount,
    availableCount,
    available: availableCount > 0 && room.is_active,
  };
}

async function listRoomsWithAvailability(filters) {
  const rooms = await Room.findAll({
    where: { is_active: true },
    order: [["base_price", "ASC"]],
  });

  const categories = filters.category
    ? (Array.isArray(filters.category) ? filters.category : String(filters.category).split(","))
    : [];
  const requiredAmenities = filters.amenities
    ? (Array.isArray(filters.amenities) ? filters.amenities : String(filters.amenities).split(","))
    : [];

  const mapped = await Promise.all(
    rooms.map(async (room) => {
      const price = calculateEffectivePrice(room, filters.checkIn);
      const availability = await getAvailabilityForRoom(room, filters.checkIn, filters.checkOut);
      const normalizedRoom = normalizeRoomRecord(room);

      return {
        ...normalizedRoom,
        ...availability,
        pricing: price,
        urgencyLabel: availability.availableCount > 0 && availability.availableCount <= 3
          ? `Only ${availability.availableCount} rooms left!`
          : null,
        instantConfirmation: room.status !== "maintenance",
      };
    })
  );

  return mapped.filter((room) => {
    if (categories.length && !categories.includes(room.category)) {
      return false;
    }

    if (filters.guests && Number(room.capacity) < Number(filters.guests)) {
      return false;
    }

    if (filters.minPrice && room.pricing.pricePerNight < Number(filters.minPrice)) {
      return false;
    }

    if (filters.maxPrice && room.pricing.pricePerNight > Number(filters.maxPrice)) {
      return false;
    }

    if (filters.viewType && room.view_type !== filters.viewType) {
      return false;
    }

    if (requiredAmenities.length) {
      return requiredAmenities.every((amenity) => room.amenities.includes(amenity));
    }

    return true;
  });
}

module.exports = {
  calculateEffectivePrice,
  countOverlappingBookings,
  getAvailabilityForRoom,
  listRoomsWithAvailability,
  normalizeRoomRecord,
};
