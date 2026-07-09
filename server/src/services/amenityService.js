const { Op } = require("sequelize");
const { Amenity, RoomAmenity } = require("../../models");

function normalizeAmenityIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
}

function amenityInclude({ activeOnly = false } = {}) {
  return {
    model: Amenity,
    as: "amenityRecords",
    attributes: ["id", "name", "icon", "category", "status", "created_at", "updated_at"],
    through: { attributes: [] },
    required: false,
    ...(activeOnly ? { where: { status: "active" } } : {}),
  };
}

async function validateAmenitySelection(amenityIds, options = {}) {
  const ids = normalizeAmenityIds(amenityIds);
  if (!ids.length) return [];

  const amenities = await Amenity.findAll({
    where: { id: { [Op.in]: ids } },
    transaction: options.transaction,
  });
  const foundIds = new Set(amenities.map((amenity) => Number(amenity.id)));
  const missingIds = ids.filter((id) => !foundIds.has(id));

  if (missingIds.length) {
    const error = new Error(`Invalid amenity IDs: ${missingIds.join(", ")}`);
    error.status = 400;
    throw error;
  }

  const allowedInactiveIds = new Set(
    normalizeAmenityIds(options.allowedInactiveIds)
  );
  const blockedInactive = amenities.filter(
    (amenity) => amenity.status !== "active" && !allowedInactiveIds.has(Number(amenity.id))
  );

  if (blockedInactive.length) {
    const error = new Error(
      `Inactive amenities cannot be assigned: ${blockedInactive.map((item) => item.name).join(", ")}`
    );
    error.status = 400;
    throw error;
  }

  const byId = new Map(amenities.map((amenity) => [Number(amenity.id), amenity]));
  return ids.map((id) => byId.get(id));
}

async function getRoomAmenityIds(roomId, transaction) {
  const rows = await RoomAmenity.findAll({
    where: { room_id: roomId },
    attributes: ["amenity_id"],
    transaction,
  });
  return rows.map((row) => Number(row.amenity_id));
}

async function replaceRoomAmenities(room, amenities, transaction) {
  await RoomAmenity.destroy({
    where: { room_id: room.id },
    transaction,
  });

  if (amenities.length) {
    await RoomAmenity.bulkCreate(
      amenities.map((amenity) => ({
        room_id: room.id,
        amenity_id: amenity.id,
      })),
      { transaction }
    );
  }

  await room.update(
    { amenities: amenities.map((amenity) => amenity.name) },
    { transaction }
  );
}

module.exports = {
  amenityInclude,
  getRoomAmenityIds,
  normalizeAmenityIds,
  replaceRoomAmenities,
  validateAmenitySelection,
};
