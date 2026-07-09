const { Op } = require("sequelize");
const {
  sequelize,
  Feedback,
  Booking,
  CustomerHistory,
  Room,
  Staff,
} = require("../../../models");
const { listPublicFeedback } = require("../../services/feedbackService");

async function listPublishedFeedback(req, res) {
  const items = await listPublicFeedback({ limit: req.query.limit || 12 });

  return res.json({
    success: true,
    data: items,
    total: items.length,
    page: 1,
    limit: items.length || 10,
  });
}

async function submitFeedback(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const booking = await Booking.findOne({
      where: {
        id: req.body.booking_id,
        customer_id: req.user.id,
        status: "checked_out",
      },
      transaction,
      lock: transaction.LOCK?.UPDATE,
    });

    if (!booking) {
      await transaction.rollback();
      return res.status(400).json({ success: false, error: "Booking is not eligible for feedback" });
    }

    const existing = await Feedback.findOne({
      where: { booking_id: req.body.booking_id },
      transaction,
    });

    if (existing) {
      await transaction.rollback();
      return res.status(409).json({ success: false, error: "Feedback has already been submitted for this booking" });
    }

    const item = await Feedback.create({
      ...req.body,
      customer_id: req.user.id,
      source: "customer",
      status: "pending",
    }, { transaction });

    await CustomerHistory.update(
      { feedback_given: true },
      { where: { booking_id: booking.id, customer_id: req.user.id }, transaction }
    );
    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: item,
      message: "Feedback submitted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function listAdminFeedback(req, res) {
  const where = {};
  if (req.query.status) {
    where.status = req.query.status;
  }
  if (req.query.source) {
    where.source = req.query.source;
  }
  if (req.query.q) {
    const query = `%${String(req.query.q).trim()}%`;
    where[Op.or] = [
      { cust_name: { [Op.like]: query } },
      { comment: { [Op.like]: query } },
      { room_number: { [Op.like]: query } },
      { collected_by_receptionist_name: { [Op.like]: query } },
      { "$booking.booking_ref$": { [Op.like]: query } },
      { "$booking.room.room_number$": { [Op.like]: query } },
    ];
  }

  const items = await Feedback.findAll({
    where: Reflect.ownKeys(where).length ? where : undefined,
    include: [
      {
        model: Booking,
        as: "booking",
        required: false,
        attributes: ["id", "booking_ref", "check_in", "check_out"],
        include: [{
          model: Room,
          as: "room",
          required: false,
          attributes: ["id", "room_number", "name", "category"],
        }],
      },
      {
        model: Staff,
        as: "collectedByReceptionist",
        required: false,
        attributes: ["id", "full_name"],
      },
    ],
    order: [["collected_at", "DESC"], ["created_at", "DESC"]],
    subQuery: false,
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
