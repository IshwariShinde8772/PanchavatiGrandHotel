const { Op } = require("sequelize");
const { Room, Booking, Offer } = require("../../models");
const env = require("../config/env");
const {
  diffNights,
  getBusinessDate,
  isDateInRange,
  parseDateInput,
} = require("../utils/dateHelpers");
const { amenityInclude } = require("./amenityService");

const BLOCKING_BOOKING_STATUSES = ["reserved", "confirmed", "checked_in"];

async function refreshExpiredNoShows(now = new Date()) {
  // Loaded lazily to keep the availability and no-show services acyclic.
  const { autoCancelOverdueBookings } = require("./reservationService");
  return autoCancelOverdueBookings(now);
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(dateValue, days) {
  const date = parseDateInput(dateValue);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

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

function normalizeRoomRecord(room, options = {}) {
  const plain = typeof room?.get === "function" ? room.get({ plain: true }) : { ...room };
  const hasAmenityRecords = Object.prototype.hasOwnProperty.call(plain, "amenityRecords");
  const amenityDetails = hasAmenityRecords
    ? (plain.amenityRecords || [])
      .map((amenity) => ({
        id: amenity.id,
        name: amenity.name,
        icon: amenity.icon || null,
        category: amenity.category || "Other",
        ...(!options.publicView ? {
          status: amenity.status,
          created_at: amenity.created_at,
          updated_at: amenity.updated_at,
        } : {}),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const legacyAmenities = normalizeStringArray(plain.amenities);

  delete plain.amenityRecords;
  delete plain.seasonal_price;
  delete plain.seasonal_start;
  delete plain.seasonal_end;

  return {
    ...plain,
    amenities: hasAmenityRecords
      ? amenityDetails.map((amenity) => amenity.name)
      : legacyAmenities,
    amenity_details: amenityDetails,
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
  const today = getBusinessDate(new Date(), env.hotelTimeZone);
  await Offer.update(
    { is_active: false },
    {
      where: {
        is_active: true,
        end_date: { [Op.lt]: today },
      },
    }
  );

  const targetDate = effectiveDate || today;
  return Offer.findAll({
    where: {
      is_active: true,
      start_date: { [Op.lte]: targetDate },
      end_date: { [Op.gte]: targetDate },
    },
    order: [["discount_pct", "DESC"], ["end_date", "ASC"]],
  });
}

async function listOffersForRange(checkIn, checkOut) {
  const today = getBusinessDate(new Date(), env.hotelTimeZone);
  await Offer.update(
    { is_active: false },
    { where: { is_active: true, end_date: { [Op.lt]: today } } }
  );

  const lastNight = addUtcDays(checkOut, -1);
  if (!checkIn || !lastNight) return [];

  return Offer.findAll({
    where: {
      is_active: true,
      start_date: { [Op.lte]: lastNight },
      end_date: { [Op.gte]: checkIn },
    },
    order: [["discount_pct", "DESC"], ["end_date", "ASC"]],
  });
}

function calculateEffectivePrice(room, checkIn, offers = []) {
  const basePrice = Number(room.base_price);
  const effectiveDate = checkIn || getBusinessDate(new Date(), env.hotelTimeZone);
  const offer = findBestOfferForRoom(room, offers, effectiveDate);
  const roomDiscountPct = room.discount_pct ? Number(room.discount_pct) : null;
  const discountPct = offer?.discount_pct || roomDiscountPct;

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
    : basePrice;

  const discountAmount = hasDiscount
    ? Number((basePrice - discountedPrice).toFixed(2))
    : 0;

  return {
    basePrice,
    seasonalPrice: null,
    pricePerNight: finalPrice,
    finalPrice,
    priceType: offer ? "offer" : hasDiscount ? "discounted" : "base",
    discountPct: hasDiscount ? discountPct : 0,
    discountAmount,
    hasDiscount,
    offer: hasDiscount && offer ? offer : null,
    savings: Number(Math.max(basePrice - finalPrice, 0).toFixed(2)),
  };
}

async function calculateStayPricing(room, checkIn, checkOut) {
  const nights = diffNights(checkIn, checkOut);
  if (!Number.isInteger(nights) || nights < 1) {
    const error = new Error("Check-out must be after check-in");
    error.status = 400;
    throw error;
  }

  const offers = await listOffersForRange(checkIn, checkOut);
  const nightlyRates = Array.from({ length: nights }, (_, index) => {
    const date = addUtcDays(checkIn, index);
    const pricing = calculateEffectivePrice(room, date, offers);
    return {
      date,
      basePrice: pricing.basePrice,
      price: pricing.pricePerNight,
      priceType: pricing.offer ? "offer" : "standard",
      discountPct: pricing.discountPct,
      discountAmount: pricing.discountAmount,
      offer: pricing.offer,
    };
  });

  const baseAmount = roundMoney(nightlyRates.reduce((sum, item) => sum + item.basePrice, 0));
  const totalFare = roundMoney(nightlyRates.reduce((sum, item) => sum + item.price, 0));
  const discountAmount = roundMoney(nightlyRates.reduce((sum, item) => sum + item.discountAmount, 0));
  const uniqueOffers = nightlyRates
    .map((item) => item.offer)
    .filter((offer, index, items) => offer && items.findIndex((candidate) => candidate?.id === offer.id) === index);

  return {
    nights,
    nightlyRates,
    baseAmount,
    discountAmount,
    totalFare,
    averagePricePerNight: roundMoney(totalFare / nights),
    offer: uniqueOffers.length === 1 ? uniqueOffers[0] : null,
    offers: uniqueOffers,
  };
}

async function countOverlappingBookings({ roomId, checkIn, checkOut, excludeBookingId, transaction, lockRows = false }) {
  if (!checkIn || !checkOut) {
    return 0;
  }

  const where = {
    room_id: roomId,
    status: {
      [Op.in]: BLOCKING_BOOKING_STATUSES,
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
    available: availableCount > 0 && room.is_active && room.status === "available",
  };
}

async function getAvailabilityCalendar(room, startDate, days = 30) {
  const normalizedStart = parseDateInput(startDate)
    ? toDateOnly(parseDateInput(startDate))
    : getBusinessDate(new Date(), env.hotelTimeZone);
  const safeDays = Math.min(Math.max(Number(days) || 30, 1), 90);
  const endDate = addUtcDays(normalizedStart, safeDays);

  const [bookings, offers] = await Promise.all([
    Booking.findAll({
      where: {
        room_id: room.id,
        status: { [Op.in]: BLOCKING_BOOKING_STATUSES },
        check_out: { [Op.gt]: normalizedStart },
        check_in: { [Op.lt]: endDate },
      },
      attributes: ["id", "check_in", "check_out", "status"],
      order: [["check_in", "ASC"]],
    }),
    listOffersForRange(normalizedStart, endDate),
  ]);

  return Array.from({ length: safeDays }, (_, index) => {
    const date = addUtcDays(normalizedStart, index);
    const occupiedUnits = bookings.filter((booking) => (
      String(booking.check_in) <= date && String(booking.check_out) > date
    )).length;
    const occupied = occupiedUnits >= Number(room.total_units || 1);
    const pricing = calculateEffectivePrice(room, date, offers);

    const operationalStatus = room.status === "maintenance"
      ? "maintenance"
      : occupied
        ? "occupied"
        : room.status === "cleaning"
          ? "cleaning"
          : room.status === "occupied"
            ? "occupied"
            : "available";

    return {
      date,
      available: operationalStatus === "available" && room.is_active,
      status: operationalStatus,
      availableCount: Math.max(Number(room.total_units || 1) - occupiedUnits, 0),
      rateType: pricing.offer ? "offer" : "standard",
      price: pricing.pricePerNight,
      basePrice: pricing.basePrice,
      discountPct: pricing.discountPct,
      offer: pricing.offer,
    };
  });
}

async function listRoomsWithAvailability(filters) {
  await refreshExpiredNoShows();
  const effectiveDate = filters.checkIn || getBusinessDate(new Date(), env.hotelTimeZone);
  const activeOffers = await listActiveOffers(effectiveDate);
  const rooms = await Room.findAll({
    where: { is_active: true },
    include: [amenityInclude({ activeOnly: true })],
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
      const normalizedRoom = normalizeRoomRecord(room, { publicView: true });

      return {
        ...normalizedRoom,
        ...availability,
        pricing: price,
        urgencyLabel: availability.availableCount > 0 && availability.availableCount <= 3
          ? `Only ${availability.availableCount} rooms left!`
          : null,
        instantConfirmation: room.status === "available",
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
  calculateStayPricing,
  countOverlappingBookings,
  findBestOfferForRoom,
  getAvailabilityCalendar,
  getAvailabilityForRoom,
  listActiveOffers,
  listOffersForRange,
  listRoomsWithAvailability,
  normalizeRoomRecord,
  refreshExpiredNoShows,
};
