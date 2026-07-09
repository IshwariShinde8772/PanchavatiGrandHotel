const { Op } = require("sequelize");
const { Offer } = require("../../../models");
const { getPagination } = require("../../utils/pagination");

const ROOM_CATEGORIES = new Map([
  ["all", "All"],
  ["standard", "Standard"],
  ["deluxe", "Deluxe"],
  ["regular", "Regular"],
]);

function normalizeOfferCategory(value) {
  return ROOM_CATEGORIES.get(String(value || "All").trim().toLocaleLowerCase()) || null;
}

function normalizeOfferPayload(payload = {}) {
  const normalized = {
    title: String(payload.title || "").trim(),
    description: payload.description ? String(payload.description).trim() : null,
    discount_pct: Number(payload.discount_pct),
    start_date: payload.start_date,
    end_date: payload.end_date,
    room_category: normalizeOfferCategory(payload.room_category),
    is_active: payload.is_active === undefined ? true : Boolean(payload.is_active),
  };

  if (!normalized.title) {
    return { error: "Offer title is required" };
  }

  if (!Number.isFinite(normalized.discount_pct) || normalized.discount_pct <= 0 || normalized.discount_pct > 100) {
    return { error: "Discount must be between 1 and 100" };
  }

  if (!normalized.start_date || !normalized.end_date) {
    return { error: "Offer start and end dates are required" };
  }

  if (new Date(normalized.end_date) < new Date(normalized.start_date)) {
    return { error: "Offer end date must be on or after start date" };
  }

  if (!normalized.room_category) {
    return { error: "Offer room category is invalid" };
  }

  return { payload: normalized };
}

async function listOffers(req, res) {
  await expireOffers();
  const { page, limit, offset } = getPagination(req.query);
  const { count, rows } = await Offer.findAndCountAll({
    order: [["start_date", "ASC"]],
    offset,
    limit,
  });
  return res.json({
    success: true,
    data: rows,
    total: count,
    page,
    limit,
    totalRecords: count,
    totalPages: Math.max(Math.ceil(count / limit), 1),
    currentPage: page,
    pageSize: limit,
  });
}

async function expireOffers(referenceDate = new Date().toISOString().slice(0, 10)) {
  await Offer.update(
    { is_active: false },
    {
      where: {
        is_active: true,
        end_date: { [Op.lt]: referenceDate },
      },
    }
  );
}

async function createOffer(req, res) {
  const { payload, error } = normalizeOfferPayload(req.body);
  if (error) {
    return res.status(400).json({ success: false, error });
  }

  const offer = await Offer.create(payload);
  return res.status(201).json({ success: true, data: offer, message: "Offer created" });
}

async function updateOffer(req, res) {
  const offer = await Offer.findByPk(req.params.id);
  if (!offer) {
    return res.status(404).json({ success: false, error: "Offer not found" });
  }

  const { payload, error } = normalizeOfferPayload({ ...offer.get({ plain: true }), ...req.body });
  if (error) {
    return res.status(400).json({ success: false, error });
  }

  await offer.update(payload);
  return res.json({ success: true, data: offer, message: "Offer updated" });
}

async function deleteOffer(req, res) {
  const offer = await Offer.findByPk(req.params.id);
  if (!offer) {
    return res.status(404).json({ success: false, error: "Offer not found" });
  }
  await offer.destroy();
  return res.json({ success: true, message: "Offer deleted" });
}

module.exports = {
  listOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  expireOffers,
};
