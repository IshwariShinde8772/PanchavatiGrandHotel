jest.mock("../models", () => ({
  Feedback: {
    findAll: jest.fn(),
  },
}));

const { Feedback } = require("../models");
const {
  PUBLIC_FEEDBACK_ATTRIBUTES,
  listPublicFeedback,
} = require("../src/services/feedbackService");

describe("public feedback safety", () => {
  it("returns published feedback using only explicitly safe fields", async () => {
    Feedback.findAll.mockResolvedValue([]);

    await listPublicFeedback({ limit: 6 });

    expect(Feedback.findAll).toHaveBeenCalledWith({
      where: { status: "published" },
      attributes: PUBLIC_FEEDBACK_ATTRIBUTES,
      order: [["created_at", "DESC"]],
      limit: 6,
    });
    expect(PUBLIC_FEEDBACK_ATTRIBUTES).not.toEqual(expect.arrayContaining([
      "customer_id",
      "internal_note",
      "admin_reply",
      "photos",
    ]));
  });

  it("caps public feedback responses at twelve items", async () => {
    Feedback.findAll.mockResolvedValue([]);
    await listPublicFeedback({ limit: 999 });

    expect(Feedback.findAll).toHaveBeenCalledWith(expect.objectContaining({ limit: 12 }));
  });
});
