const { Op } = require("sequelize");
const { Room, HotelSetting, Booking, Task, sequelize } = require("../../../models");
const {
  listRoomsWithAvailability,
  calculateEffectivePrice,
  getAvailabilityCalendar,
  getAvailabilityForRoom,
  listActiveOffers,
  normalizeRoomRecord,
  refreshExpiredNoShows,
} = require("../../services/roomService");
const { getPagination } = require("../../utils/pagination");
const { listPublicCoupons } = require("../../services/couponService");
const { listPublicFeedback } = require("../../services/feedbackService");
const env = require("../../config/env");
const { getBusinessDate } = require("../../utils/dateHelpers");
const {
  amenityInclude,
  getRoomAmenityIds,
  replaceRoomAmenities,
  validateAmenitySelection,
} = require("../../services/amenityService");
const { writeAudit } = require("../../services/auditService");
const { formatToIST } = require("../../utils/dateHelpers");

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
      // Fall back to comma-separated parsing.
    }

    return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return [];
}

function normalizeNullable(value) {
  return value === "" || value === undefined ? null : value;
}

function normalizeRoomPayload(payload) {
  const normalized = {
    ...payload,
  };
  const usesManagedAmenities = normalized.amenity_ids !== undefined;
  delete normalized.amenity_ids;
  if (usesManagedAmenities) delete normalized.amenities;

  if ("room_number" in normalized && typeof normalized.room_number === "string") {
    normalized.room_number = normalized.room_number.trim();
  }

  if ("name" in normalized && typeof normalized.name === "string") {
    normalized.name = normalized.name.trim();
  }

  if ("description" in normalized && typeof normalized.description === "string") {
    normalized.description = normalized.description.trim();
  }

  if ("amenities" in normalized) {
    normalized.amenities = normalizeStringArray(normalized.amenities);
  }

  if ("images" in normalized) {
    normalized.images = normalizeStringArray(normalized.images);
  }

  for (const key of ["discount_start", "discount_end", "view_type", "bed_type", "nashik_landmark"]) {
    if (key in normalized) {
      normalized[key] = normalizeNullable(normalized[key]);
    }
  }

  return Object.fromEntries(
    Object.entries(normalized).filter(([, value]) => value !== undefined)
  );
}

async function listRooms(req, res) {
  const { page, limit } = getPagination(req.query);
  const rooms = await listRoomsWithAvailability(req.query);
  const paginated = rooms.slice((page - 1) * limit, page * limit);

  return res.json({
    success: true,
    data: paginated,
    total: rooms.length,
    page,
    limit,
    totalRecords: rooms.length,
    totalPages: Math.max(Math.ceil(rooms.length / limit), 1),
    currentPage: page,
    pageSize: limit,
  });
}

async function getRoomDetail(req, res) {
  await refreshExpiredNoShows();
  const room = await Room.findByPk(req.params.id, {
    include: [amenityInclude({ activeOnly: true })],
  });
  if (!room) {
    return res.status(404).json({ success: false, error: "Room not found" });
  }

  const availability = await getAvailabilityForRoom(room, req.query.checkIn, req.query.checkOut);
  
  const today = getBusinessDate(new Date(), env.hotelTimeZone);
  const calendarStart = req.query.calendarStart || today;
  const availabilityCalendar = await getAvailabilityCalendar(room, calendarStart, 30);

  // Retained for backward compatibility with existing clients.
  const bookedDates = await Booking.findAll({
    where: {
      room_id: room.id,
      status: { [Op.in]: ["reserved", "confirmed", "checked_in"] },
      check_out: { [Op.gt]: calendarStart },
    },
    attributes: ["check_in", "check_out", "status"],
  });

  const effectiveDate = req.query.checkIn || today;
  const activeOffers = await listActiveOffers(effectiveDate);
  const pricing = calculateEffectivePrice(room, req.query.checkIn, activeOffers);
  const reviews = await listPublicFeedback({
    where: { room_category: room.category },
    limit: 6,
  });
  const similarRooms = (await listRoomsWithAvailability({ category: room.category }))
    .filter((item) => item.id !== room.id)
    .slice(0, 3);

  return res.json({
    success: true,
    data: {
      ...normalizeRoomRecord(room, { publicView: true }),
      pricing,
      availability,
      availability_calendar: availabilityCalendar,
      booked_dates: bookedDates,
      reviews,
      similar_rooms: similarRooms,
    },
  });
}

async function getHomeCatalogue(req, res) {
  const today = getBusinessDate(new Date(), env.hotelTimeZone);
  const [hotelSettings, featuredRooms, testimonials, offers, publicCoupons] = await Promise.all([
    HotelSetting.findByPk(1, {
      attributes: [
        "id",
        "hotel_name",
        "logo_url",
        "address",
        "phone",
        "email",
        "whatsapp",
        "check_in_time",
        "check_out_time",
        "cancellation_policy_text",
      ],
    }),
    listRoomsWithAvailability({}).then((rooms) => rooms.slice(0, 4)),
    listPublicFeedback({ limit: 6 }),
    listActiveOffers(today).then((activeOffers) => activeOffers.slice(0, 6)),
    listPublicCoupons(today),
  ]);

  return res.json({
    success: true,
    data: {
      hotel: hotelSettings,
      featuredRooms,
      testimonials,
      offers,
      publicCoupons,
    },
  });
}

async function listAdminRooms(req, res) {
  const { page, limit, offset } = getPagination(req.query);
  const { count, rows } = await Room.findAndCountAll({
    include: [amenityInclude()],
    distinct: true,
    order: [["floor", "ASC"], ["room_number", "ASC"]],
    offset,
    limit,
  });
  return res.json({
    success: true,
    data: rows.map((room) => normalizeRoomRecord(room)),
    total: count,
    page,
    limit,
    totalRecords: count,
    totalPages: Math.max(Math.ceil(count / limit), 1),
    currentPage: page,
    pageSize: limit,
  });
}

async function createRoom(req, res) {
  const room = await sequelize.transaction(async (transaction) => {
    const amenities = await validateAmenitySelection(req.body.amenity_ids || [], {
      transaction,
    });
    const createdRoom = await Room.create(normalizeRoomPayload(req.body), { transaction });
    await replaceRoomAmenities(createdRoom, amenities, transaction);
    return createdRoom;
  });
  const roomWithAmenities = await Room.findByPk(room.id, {
    include: [amenityInclude()],
  });

  return res.status(201).json({
    success: true,
    data: normalizeRoomRecord(roomWithAmenities),
    message: "Room created successfully",
  });
}

async function updateRoom(req, res) {
  const room = await sequelize.transaction(async (transaction) => {
    const existingRoom = await Room.findByPk(req.params.id, { transaction });
    if (!existingRoom) return null;

    if (req.body.status === "available") {
      const activeCheckedInCount = await Booking.count({
        where: { room_id: existingRoom.id, status: "checked_in" },
        transaction,
      });
      if (activeCheckedInCount > 0) {
        throw Object.assign(
          new Error("An occupied room cannot be marked available"),
          { status: 409 }
        );
      }
      if (existingRoom.status === "cleaning") {
        throw Object.assign(
          new Error("Use Mark as Cleaned before making this room available"),
          { status: 409 }
        );
      }
    }

    if (req.body.amenity_ids !== undefined) {
      const currentAmenityIds = await getRoomAmenityIds(existingRoom.id, transaction);
      const amenities = await validateAmenitySelection(req.body.amenity_ids, {
        transaction,
        allowedInactiveIds: currentAmenityIds,
      });
      await replaceRoomAmenities(existingRoom, amenities, transaction);
    }

    await existingRoom.update(normalizeRoomPayload(req.body), { transaction });
    return existingRoom;
  });

  if (!room) {
    return res.status(404).json({ success: false, error: "Room not found" });
  }

  const roomWithAmenities = await Room.findByPk(room.id, {
    include: [amenityInclude()],
  });
  return res.json({
    success: true,
    data: normalizeRoomRecord(roomWithAmenities),
    message: "Room updated successfully",
  });
}

async function deleteRoom(req, res) {
  const room = await Room.findByPk(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: "Room not found" });
  }

  await room.destroy();
  return res.json({
    success: true,
    message: "Room deleted successfully",
  });
}

async function getRoomGrid(req, res) {
  const rooms = await Room.findAll({
    include: [
      {
        model: Booking,
        as: "bookings",
        attributes: ["id", "status"],
        where: { status: "checked_in" },
        required: false,
      },
      {
        model: Task,
        as: "tasks",
        attributes: ["id", "status", "task_type"],
        where: {
          task_type: "cleaning",
          status: { [Op.in]: ["pending", "in_progress"] },
        },
        required: false,
      },
    ],
    order: [["floor", "ASC"], ["room_number", "ASC"]],
  });
  const data = rooms.map((room) => {
    const normalized = normalizeRoomRecord(room);
    const hasCheckedInBooking = (normalized.bookings || []).length > 0;
    const hasPendingCleaning = (normalized.tasks || []).length > 0;
    const status = room.status === "maintenance"
      ? "maintenance"
      : hasCheckedInBooking
        ? "occupied"
        : room.status === "cleaning" || hasPendingCleaning
          ? "cleaning"
          : "available";

    delete normalized.bookings;
    delete normalized.tasks;

    return {
      ...normalized,
      status,
      is_bookable: room.is_active && status === "available",
    };
  });

  return res.json({
    success: true,
    data,
    total: data.length,
    page: 1,
    limit: data.length || 10,
  });
}

async function markRoomCleaned(req, res) {
  const room = await sequelize.transaction(async (transaction) => {
    const target = await Room.findByPk(req.params.id, {
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });
    if (!target) return null;
    if (target.status === "maintenance") {
      throw Object.assign(
        new Error("A maintenance room cannot be marked cleaned"),
        { status: 409 }
      );
    }

    const activeCheckedInCount = await Booking.count({
      where: { room_id: target.id, status: "checked_in" },
      transaction,
    });
    if (activeCheckedInCount > 0) {
      throw Object.assign(
        new Error("An occupied room cannot be marked available"),
        { status: 409 }
      );
    }
    const pendingCleaningCount = await Task.count({
      where: {
        room_id: target.id,
        task_type: "cleaning",
        status: { [Op.in]: ["pending", "in_progress"] },
      },
      transaction,
    });
    if (target.status !== "cleaning" && pendingCleaningCount === 0) {
      throw Object.assign(
        new Error("Only rooms in cleaning can be marked cleaned"),
        { status: 409 }
      );
    }

    const completedAt = new Date();
    await Task.update(
      { status: "done", completed_at: completedAt },
      {
        where: {
          room_id: target.id,
          task_type: "cleaning",
          status: { [Op.in]: ["pending", "in_progress"] },
        },
        transaction,
      }
    );
    await target.update({ status: "available" }, { transaction });
    await writeAudit({
      action: "ROOM_MARKED_CLEANED",
      entityType: "room",
      entityId: target.id,
      actor: req.user,
      module: "rooms",
      message: `Room ${target.room_number} marked cleaned and available`,
      metadata: {
        roomId: target.id,
        roomNumber: target.room_number,
        performedBy: req.user?.id || null,
        role: req.user?.role || "system",
        timestampUTC: completedAt.toISOString(),
        timestampIST: formatToIST(completedAt),
        ipAddress: req.ip || req.headers?.["x-forwarded-for"] || null,
        userAgent: req.headers?.["user-agent"] || null,
        oldValue: { status: "cleaning" },
        newValue: { status: "available" },
      },
      transaction,
    });
    return target;
  });

  if (!room) {
    return res.status(404).json({ success: false, error: "Room not found" });
  }

  return res.json({
    success: true,
    data: normalizeRoomRecord(room),
    message: "Room marked as cleaned and available",
  });
}

module.exports = {
  listRooms,
  getRoomDetail,
  getHomeCatalogue,
  listAdminRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getRoomGrid,
  markRoomCleaned,
};
