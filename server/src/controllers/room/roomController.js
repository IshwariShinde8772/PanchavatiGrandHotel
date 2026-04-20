const { Op } = require("sequelize");
const { Room, Feedback, HotelSetting, Booking, Offer } = require("../../../models");
const { listRoomsWithAvailability, calculateEffectivePrice, getAvailabilityForRoom, normalizeRoomRecord } = require("../../services/roomService");
const { getPagination } = require("../../utils/pagination");

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

  for (const key of ["seasonal_start", "seasonal_end", "discount_start", "discount_end", "view_type", "bed_type", "nashik_landmark"]) {
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
  });
}

async function getRoomDetail(req, res) {
  const room = await Room.findByPk(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: "Room not found" });
  }

  const availability = await getAvailabilityForRoom(room, req.query.checkIn, req.query.checkOut);
  
  // Fetch booked dates for the calendar (next 30 days)
  const bookedDates = await Booking.findAll({
    where: {
      room_id: room.id,
      status: { [Op.in]: ["confirmed", "checked_in"] },
      check_out: { [Op.gt]: new Date() }
    },
    attributes: ["check_in", "check_out"]
  });

  const pricing = calculateEffectivePrice(room, req.query.checkIn);
  const reviews = await Feedback.findAll({
    where: {
      room_category: room.category,
      status: "published",
    },
    order: [["created_at", "DESC"]],
    limit: 6,
  });
  const similarRooms = (await listRoomsWithAvailability({ category: room.category }))
    .filter((item) => item.id !== room.id)
    .slice(0, 3);

  return res.json({
    success: true,
    data: {
      ...normalizeRoomRecord(room),
      pricing,
      availability,
      booked_dates: bookedDates,
      reviews,
      similar_rooms: similarRooms,
    },
  });
}

async function getHomeCatalogue(req, res) {
  const today = new Date().toISOString().slice(0, 10);
  const [hotelSettings, featuredRooms, testimonials, offers] = await Promise.all([
    HotelSetting.findByPk(1),
    listRoomsWithAvailability({}).then((rooms) => rooms.slice(0, 4)),
    Feedback.findAll({
      where: { status: "published" },
      order: [["created_at", "DESC"]],
      limit: 6,
    }),
    Offer.findAll({
      where: {
        is_active: true,
        end_date: { [Op.gte]: today },
      },
      order: [["end_date", "ASC"]],
      limit: 6,
    }),
  ]);

  return res.json({
    success: true,
    data: {
      hotel: hotelSettings,
      featuredRooms,
      testimonials,
      offers,
    },
  });
}

async function listAdminRooms(req, res) {
  const rooms = await Room.findAll({ order: [["floor", "ASC"], ["room_number", "ASC"]] });
  return res.json({
    success: true,
    data: rooms.map((room) => normalizeRoomRecord(room)),
    total: rooms.length,
    page: 1,
    limit: rooms.length || 10,
  });
}

async function createRoom(req, res) {
  const room = await Room.create(normalizeRoomPayload(req.body));
  return res.status(201).json({
    success: true,
    data: normalizeRoomRecord(room),
    message: "Room created successfully",
  });
}

async function updateRoom(req, res) {
  const room = await Room.findByPk(req.params.id);
  if (!room) {
    return res.status(404).json({ success: false, error: "Room not found" });
  }

  await room.update(normalizeRoomPayload(req.body));
  return res.json({
    success: true,
    data: normalizeRoomRecord(room),
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
  const rooms = await Room.findAll({ order: [["floor", "ASC"], ["room_number", "ASC"]] });
  return res.json({
    success: true,
    data: rooms.map((room) => normalizeRoomRecord(room)),
    total: rooms.length,
    page: 1,
    limit: rooms.length || 10,
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
};
