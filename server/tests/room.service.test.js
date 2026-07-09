jest.mock("../models", () => ({
  Room: {},
  Booking: {
    count: jest.fn(),
    findAll: jest.fn(),
  },
  Offer: {
    update: jest.fn(),
    findAll: jest.fn(),
  },
}));

const { Op } = require("sequelize");
const { Booking, Offer } = require("../models");
const {
  calculateEffectivePrice,
  calculateStayPricing,
  countOverlappingBookings,
  getAvailabilityCalendar,
  getAvailabilityForRoom,
} = require("../src/services/roomService");

const room = {
  id: 2,
  category: "Deluxe",
  base_price: 1000,
  total_units: 1,
  is_active: true,
  status: "available",
};

describe("room availability and offer pricing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Offer.update.mockResolvedValue([0]);
  });

  it("applies an active admin offer to each eligible stay night", async () => {
    Offer.findAll.mockResolvedValue([{
      id: 7,
      title: "Monsoon",
      discount_pct: 20,
      start_date: "2026-07-01",
      end_date: "2026-07-05",
      room_category: "Deluxe",
    }]);

    const quote = await calculateStayPricing(room, "2026-07-04", "2026-07-07");

    expect(quote.nights).toBe(3);
    expect(quote.baseAmount).toBe(3000);
    expect(quote.discountAmount).toBe(400);
    expect(quote.totalFare).toBe(2600);
    expect(quote.nightlyRates.map((item) => item.priceType)).toEqual(["offer", "offer", "standard"]);
    expect(quote.nightlyRates.map((item) => item.price)).toEqual([800, 800, 1000]);
  });

  it("ignores legacy seasonal room prices", () => {
    const pricing = calculateEffectivePrice({
      ...room,
      seasonal_price: 500,
      seasonal_start: "2026-07-01",
      seasonal_end: "2026-07-31",
    }, "2026-07-15", []);

    expect(pricing.pricePerNight).toBe(1000);
    expect(pricing.priceType).toBe("base");
    expect(pricing.seasonalPrice).toBeNull();
  });

  it("treats checkout as available and includes paid reservations as occupied", async () => {
    Booking.findAll.mockResolvedValue([{
      id: 10,
      check_in: "2026-06-29",
      check_out: "2026-06-30",
      status: "reserved",
    }]);
    Offer.findAll.mockResolvedValue([]);

    const calendar = await getAvailabilityCalendar(room, "2026-06-29", 2);

    expect(calendar[0]).toEqual(expect.objectContaining({
      date: "2026-06-29",
      status: "occupied",
      available: false,
    }));
    expect(calendar[1]).toEqual(expect.objectContaining({
      date: "2026-06-30",
      status: "available",
      available: true,
      rateType: "standard",
    }));
  });

  it("uses the strict overlap rule and only blocking statuses", async () => {
    Booking.count.mockResolvedValue(1);

    await countOverlappingBookings({
      roomId: 2,
      checkIn: "2026-06-29",
      checkOut: "2026-06-30",
    });

    const where = Booking.count.mock.calls[0][0].where;
    expect(where.room_id).toBe(2);
    expect(where.status[Op.in]).toEqual(["reserved", "confirmed", "checked_in"]);
    expect(where.check_out[Op.gt]).toBe("2026-06-29");
    expect(where.check_in[Op.lt]).toBe("2026-06-30");
  });

  it.each(["cleaning", "maintenance", "occupied"])(
    "does not expose a %s room as bookable",
    async (status) => {
      const result = await getAvailabilityForRoom(
        { ...room, status },
        undefined,
        undefined
      );

      expect(result.available).toBe(false);
    }
  );
});
