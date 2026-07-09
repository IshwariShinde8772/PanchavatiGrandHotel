const { Feedback } = require("../../models");

const PUBLIC_FEEDBACK_ATTRIBUTES = [
  "id",
  "cust_name",
  "rating",
  "title",
  "comment",
  "room_category",
  "room_name",
  "created_at",
];

async function listPublicFeedback(options = {}) {
  const requestedLimit = Number(options.limit || 6);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? requestedLimit : 6, 1), 12);

  return Feedback.findAll({
    where: {
      status: "published",
      ...(options.where || {}),
    },
    attributes: PUBLIC_FEEDBACK_ATTRIBUTES,
    order: [["created_at", "DESC"]],
    limit,
  });
}

module.exports = {
  PUBLIC_FEEDBACK_ATTRIBUTES,
  listPublicFeedback,
};
