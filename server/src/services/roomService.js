const { Op } = require("sequelize");
const { Room, Booking, Offer } = require("../../models");
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

function normalizeOfferRecord(offer) {
  if (!offer) {
    return null;
  }

  const plain = typeof offer?.get === "function" ? offer.get({ plain: true }) : { ...offer };
  return {
    id: plain.id,
    title: plain.title,
    description: plain.description,
    discount_pct: Number(plain.discount_pct),
    start_date: plain.start_date,
    end_date: plain.end_date,
    room_category: plain.room_category || "All",
  };
}

function findBestOfferForRoom(room, offers = [], effectiveDate) {
  const roomCategory = String(room.category || "").trim();

  return offers
    .map(normalizeOfferRecord)
    .filter(Boolean)
    .filter((offer) => (
      offer.discount_pct > 0
      && (offer.room_category === "All" || offer.room_category === roomCategory)
      && isDateInRange(effectiveDate, offer.start_date, offer.end_date)
    ))
    .sort((a, b) => Number(b.discount_pct) - Number(a.discount_pct))[0] || null;
}

async function listActiveOffers(effectiveDate) {
  return Offer.findAll({
    where: {
      is_active: true,
      start_date: { [Op.lte]: effectiveDate },
      end_date: { [Op.gte]: effectiveDate },
    },
    order: [["discount_pct", "DESC"], ["end_date", "ASC"]],
  });
}

function calculateEffectivePrice(room, checkIn, offers = []) {
  const basePrice = Number(room.base_price);
  const seasonalPrice = room.seasonal_price ? Number(room.seasonal_price) : null;
  const effectiveDate = checkIn || new Date().toISOString().slice(0, 10);
  const offer = findBestOfferForRoom(room, offers, effectiveDate);
  const roomDiscountPct = room.discount_pct ? Number(room.discount_pct) : null;
  const discountPct = offer?.discount_pct || roomDiscountPct;

  const hasSeasonalPrice = Boolean(
    seasonalPrice
    && room.seasonal_start
    && room.seasonal_end
    && isDateInRange(effectiveDate, room.seasonal_start, room.seasonal_end)
  );

  const hasDiscount = Boolean(
    discountPct
    && (
      offer
      || (
        room.discount_start
        && room.discount_end
        && isDateInRange(effectiveDate, room.discount_start, room.discount_end)
      )
    )
  );

  const discountedPrice = hasDiscount
    ? Number((basePrice * (1 - discountPct / 100)).toFixed(2))
    : null;

  const finalPrice = hasDiscount
    ? discountedPrice
    : hasSeasonalPrice
      ? seasonalPrice
      : basePrice;

  const discountAmount = hasDiscount
    ? Number((basePrice - discountedPrice).toFixed(2))
    : 0;

  return {
    basePrice,
    seasonalPrice: hasSeasonalPrice ? seasonalPrice : null,
    pricePerNight: finalPrice,
    finalPrice,
    priceType: offer ? "offer" : hasDiscount ? "discounted" : hasSeasonalPrice ? "seasonal" : "base",
    discountPct: hasDiscount ? discountPct : 0,
    discountAmount,
    hasDiscount,
    offer: hasDiscount && offer ? offer : null,
    savings: Number(Math.max(basePrice - finalPrice, 0).toFixed(2)),
  };
}

async function countOverlappingBookings({ roomId, checkIn, checkOut, excludeBookingId, transaction, lockRows = false }) {
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

  if (lockRows && transaction) {
    // Lock overlapping booking rows so concurrent writes cannot overbook.
    const rows = await Booking.findAll({
      where,
      attributes: ["id"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    return rows.length;
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
  const effectiveDate = filters.checkIn || new Date().toISOString().slice(0, 10);
  const activeOffers = await listActiveOffers(effectiveDate);
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
      const price = calculateEffectivePrice(room, filters.checkIn, activeOffers);
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
  findBestOfferForRoom,
  getAvailabilityForRoom,
  listActiveOffers,
  listRoomsWithAvailability,
  normalizeRoomRecord,
};
