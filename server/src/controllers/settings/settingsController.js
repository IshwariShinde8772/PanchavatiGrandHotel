const { HotelSetting } = require("../../../models");

async function getSettings(req, res) {
  const settings = await HotelSetting.findByPk(1);
  return res.json({ success: true, data: settings });
}

async function getPublicSettings(req, res) {
  const settings = await HotelSetting.findByPk(1, {
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
  });
  return res.json({
    success: true,
    data: settings,
  });
}

async function updateSettings(req, res) {
  const [settings] = await HotelSetting.findOrCreate({
    where: { id: 1 },
    defaults: { id: 1, hotel_name: "Panchavati Grand" },
  });

  await settings.update({
    ...req.body,
    updated_at: new Date(),
  });

  return res.json({
    success: true,
    data: settings,
    message: "Settings updated successfully",
  });
}

module.exports = {
  getSettings,
  getPublicSettings,
  updateSettings,
};
