const { SeasonalPrice } = require("../../../models");

async function listSeasonalPrices(req, res) {
  const prices = await SeasonalPrice.findAll({
    order: [["start_date", "ASC"]],
  });
  return res.json({ success: true, data: prices });
}

async function createSeasonalPrice(req, res) {
  const price = await SeasonalPrice.create(req.body);
  return res.status(201).json({ success: true, data: price, message: "Seasonal price created" });
}

async function updateSeasonalPrice(req, res) {
  const price = await SeasonalPrice.findByPk(req.params.id);
  if (!price) {
    return res.status(404).json({ success: false, error: "Seasonal price not found" });
  }
  await price.update(req.body);
  return res.json({ success: true, data: price, message: "Seasonal price updated" });
}

async function deleteSeasonalPrice(req, res) {
  const price = await SeasonalPrice.findByPk(req.params.id);
  if (!price) {
    return res.status(404).json({ success: false, error: "Seasonal price not found" });
  }
  await price.destroy();
  return res.json({ success: true, message: "Seasonal price deleted" });
}

module.exports = {
  listSeasonalPrices,
  createSeasonalPrice,
  updateSeasonalPrice,
  deleteSeasonalPrice,
};
