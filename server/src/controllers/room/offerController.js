const { Offer } = require("../../../models");

const ROOM_CATEGORIES = new Set(["All", "Standard", "Deluxe", "Suite", "Family", "Presidential"]);

function normalizeOfferPayload(payload = {}) {
  const normalized = {
    title: String(payload.title || "").trim(),
    description: payload.description ? String(payload.description).trim() : null,
    discount_pct: Number(payload.discount_pct),
    start_date: payload.start_date,
    end_date: payload.end_date,
    room_category: payload.room_category || "All",
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

  if (!ROOM_CATEGORIES.has(normalized.room_category)) {
    return { error: "Offer room category is invalid" };
  }

  return { payload: normalized };
}

async function listOffers(req, res) {
  const offers = await Offer.findAll({
    order: [["start_date", "ASC"]],
  });
  return res.json({ success: true, data: offers });
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
};
