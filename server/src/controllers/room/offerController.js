const { Offer } = require("../../../models");

async function listOffers(req, res) {
  const offers = await Offer.findAll({
    order: [["start_date", "ASC"]],
  });
  return res.json({ success: true, data: offers });
}

async function createOffer(req, res) {
  const offer = await Offer.create(req.body);
  return res.status(201).json({ success: true, data: offer, message: "Offer created" });
}

async function updateOffer(req, res) {
  const offer = await Offer.findByPk(req.params.id);
  if (!offer) {
    return res.status(404).json({ success: false, error: "Offer not found" });
  }
  await offer.update(req.body);
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
