const { fn, col, where, Op } = require("sequelize");
const { Amenity, RoomAmenity } = require("../../../models");

function normalizeAmenityPayload(payload) {
  const normalized = { ...payload };
  if (typeof normalized.name === "string") normalized.name = normalized.name.trim();
  if (normalized.icon === "") normalized.icon = null;
  return normalized;
}

async function findDuplicateName(name, excludeId) {
  const conditions = [
    where(fn("LOWER", col("name")), String(name).trim().toLocaleLowerCase()),
  ];
  if (excludeId) conditions.push({ id: { [Op.ne]: excludeId } });
  return Amenity.findOne({ where: { [Op.and]: conditions } });
}

async function listAmenities(req, res) {
  const whereClause = {};
  if (req.query.status) whereClause.status = req.query.status;
  if (req.query.search) {
    whereClause.name = { [Op.like]: `%${req.query.search}%` };
  }

  const amenities = await Amenity.findAll({
    where: whereClause,
    order: [["category", "ASC"], ["name", "ASC"]],
  });

  return res.json({
    success: true,
    data: amenities,
    total: amenities.length,
  });
}

async function createAmenity(req, res) {
  const payload = normalizeAmenityPayload(req.body);
  if (await findDuplicateName(payload.name)) {
    return res.status(409).json({
      success: false,
      error: "An amenity with this name already exists",
    });
  }

  const amenity = await Amenity.create(payload);
  return res.status(201).json({
    success: true,
    data: amenity,
    message: "Amenity created successfully",
  });
}

async function updateAmenity(req, res) {
  const amenity = await Amenity.findByPk(req.params.id);
  if (!amenity) {
    return res.status(404).json({ success: false, error: "Amenity not found" });
  }

  const payload = normalizeAmenityPayload(req.body);
  if (payload.name && await findDuplicateName(payload.name, amenity.id)) {
    return res.status(409).json({
      success: false,
      error: "An amenity with this name already exists",
    });
  }

  await amenity.update(payload);
  return res.json({
    success: true,
    data: amenity,
    message: "Amenity updated successfully",
  });
}

async function deleteAmenity(req, res) {
  const amenity = await Amenity.findByPk(req.params.id);
  if (!amenity) {
    return res.status(404).json({ success: false, error: "Amenity not found" });
  }

  const roomCount = await RoomAmenity.count({ where: { amenity_id: amenity.id } });
  if (roomCount > 0) {
    await amenity.update({ status: "inactive" });
    return res.json({
      success: true,
      data: amenity,
      message: "Amenity is used by rooms and was deactivated",
      deactivated: true,
    });
  }

  await amenity.destroy();
  return res.json({
    success: true,
    message: "Amenity deleted successfully",
    deactivated: false,
  });
}

module.exports = {
  createAmenity,
  deleteAmenity,
  listAmenities,
  updateAmenity,
};
