const { Feedback, Booking, CustomerHistory } = require("../../../models");

async function listPublishedFeedback(req, res) {
  const items = await Feedback.findAll({
    where: { status: "published" },
    order: [["created_at", "DESC"]],
    limit: Number(req.query.limit || 12),
  });

  return res.json({
    success: true,
    data: items,
    total: items.length,
    page: 1,
    limit: items.length || 10,
  });
}

async function submitFeedback(req, res) {
  const booking = await Booking.findOne({
    where: {
      id: req.body.booking_id,
      customer_id: req.user.id,
      status: "checked_out",
    },
  });

  if (!booking) {
    return res.status(400).json({ success: false, error: "Booking is not eligible for feedback" });
  }

  const existing = await Feedback.findOne({
    where: {
      booking_id: req.body.booking_id,
      customer_id: req.user.id,
    },
  });

  if (existing) {
    return res.status(409).json({ success: false, error: "Feedback has already been submitted for this booking" });
  }

  const item = await Feedback.create({
    ...req.body,
    customer_id: req.user.id,
    status: "pending",
  });

  await CustomerHistory.update(
    { feedback_given: true },
    { where: { booking_id: booking.id, customer_id: req.user.id } }
  );

  return res.status(201).json({
    success: true,
    data: item,
    message: "Feedback submitted successfully",
  });
}

async function listAdminFeedback(req, res) {
  const where = req.query.status ? { status: req.query.status } : undefined;
  const items = await Feedback.findAll({
    where,
    order: [["created_at", "DESC"]],
  });

  return res.json({
    success: true,
    data: items,
    total: items.length,
    page: 1,
    limit: items.length || 10,
  });
}

async function moderateFeedback(req, res) {
  const item = await Feedback.findByPk(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: "Feedback not found" });
  }

  await item.update(req.body);

  return res.json({
    success: true,
    data: item,
    message: "Feedback updated successfully",
  });
}

async function deleteFeedback(req, res) {
  const item = await Feedback.findByPk(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, error: "Feedback not found" });
  }
  await item.destroy();
  return res.json({ success: true, message: "Feedback deleted" });
}

module.exports = {
  listPublishedFeedback,
  submitFeedback,
  listAdminFeedback,
  moderateFeedback,
  deleteFeedback,
};
