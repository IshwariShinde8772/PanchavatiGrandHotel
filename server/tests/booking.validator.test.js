const {
  createBookingSchema,
  earlyCheckOutSchema,
  staySelectionSchema,
  walkInBookingSchema,
} = require("../src/validators/bookingValidator");

const futureStay = {
  room_id: 1,
  check_in: "2099-07-05",
  check_in_time: "12:00",
  check_out: "2099-07-06",
  guests: 1,
};

describe("booking check-in time validation", () => {
  it("requires a valid selected check-in time for quotes", () => {
    expect(staySelectionSchema.safeParse(futureStay).success).toBe(true);
    expect(staySelectionSchema.safeParse({
      ...futureStay,
      check_in_time: undefined,
    }).success).toBe(false);
    expect(staySelectionSchema.safeParse({
      ...futureStay,
      check_in_time: "25:00",
    }).success).toBe(false);
  });

  it("requires check-in time in customer and receptionist booking payloads", () => {
    const guest = {
      full_name: "Test Guest",
      email: "guest@example.com",
      phone: "9876543210",
      id_type: "aadhaar",
      id_number: "123412341234",
      id_doc_url: "https://example.com/id.jpg",
      id_doc_public_id: "id-proof",
      live_photo_url: "https://example.com/live.jpg",
      live_photo_public_id: "live-photo",
    };
    expect(createBookingSchema.safeParse({
      ...futureStay,
      checkout_token: "6b58524a-1ab4-4d91-97ef-509bd4d08728",
      payment_method: "online",
      guest,
    }).success).toBe(true);
    expect(walkInBookingSchema.safeParse({
      ...futureStay,
      payment_method: "cash",
      guest,
    }).success).toBe(true);
  });

  it("requires a reason and settled status for early check-out", () => {
    const payload = {
      reason: "Guest changed travel plans",
      payment_status: "paid",
      extras: [],
      feedback: {
        rating: 5,
        feedback_text: "Excellent stay",
      },
    };

    expect(earlyCheckOutSchema.safeParse(payload).success).toBe(true);
    expect(earlyCheckOutSchema.safeParse({ ...payload, reason: " " }).success).toBe(false);
    expect(earlyCheckOutSchema.safeParse({ ...payload, payment_status: "pending" }).success).toBe(false);
  });
});
