const {
  buildHotelDateTime,
  calculateAutoCancelAt,
  formatISTDateTimeForReport,
  formatToIST,
  getBusinessDate,
  getDateFilterRange,
  getTimeZoneDateRange,
  normalizeTimeInput,
} = require("../src/utils/dateHelpers");

describe("hotel business date helpers", () => {
  it("uses IST when UTC is still on the previous date", () => {
    const nearMidnightInIndia = new Date("2026-06-30T19:15:00.000Z");
    expect(getBusinessDate(nearMidnightInIndia, "Asia/Kolkata")).toBe("2026-07-01");
  });

  it("builds calendar week and next-week ranges from the IST business date", () => {
    const reference = new Date("2026-06-30T06:00:00.000Z");
    expect(getDateFilterRange("this_week", reference, "Asia/Kolkata")).toEqual({
      start: "2026-06-29",
      end: "2026-07-05",
    });
    expect(getDateFilterRange("next_week", reference, "Asia/Kolkata")).toEqual({
      start: "2026-07-06",
      end: "2026-07-12",
    });
  });

  it("returns the complete current month", () => {
    const reference = new Date("2026-06-30T06:00:00.000Z");
    expect(getDateFilterRange("this_month", reference, "Asia/Kolkata")).toEqual({
      start: "2026-06-01",
      end: "2026-06-30",
    });
  });

  it("converts a selected IST check-in time to a UTC instant", () => {
    expect(buildHotelDateTime("2026-07-05", "12:00", "Asia/Kolkata"))
      .toEqual(new Date("2026-07-05T06:30:00.000Z"));
    expect(calculateAutoCancelAt("2026-07-05", "12:00", 60, "Asia/Kolkata"))
      .toEqual(new Date("2026-07-05T07:30:00.000Z"));
  });

  it("keeps near-midnight check-in schedules on the intended hotel date", () => {
    expect(buildHotelDateTime("2026-07-05", "23:45", "Asia/Kolkata"))
      .toEqual(new Date("2026-07-05T18:15:00.000Z"));
    expect(calculateAutoCancelAt("2026-07-05", "23:45", 60, "Asia/Kolkata"))
      .toEqual(new Date("2026-07-05T19:15:00.000Z"));
  });

  it("rejects invalid check-in times and dates", () => {
    expect(normalizeTimeInput("25:00")).toBeNull();
    expect(buildHotelDateTime("2026-02-30", "12:00", "Asia/Kolkata")).toBeNull();
  });

  it("formats report and audit timestamps with an explicit IST label", () => {
    const timestamp = new Date("2026-07-02T10:15:00.000Z");
    expect(formatToIST(timestamp)).toBe("02 Jul 2026, 03:45 PM IST");
    expect(formatISTDateTimeForReport(timestamp)).toBe("02 Jul 2026, 03:45 PM IST");
  });

  it("builds IST calendar-day boundaries as UTC instants", () => {
    expect(getTimeZoneDateRange("2026-07-02", "Asia/Kolkata")).toEqual({
      start: new Date("2026-07-01T18:30:00.000Z"),
      end: new Date("2026-07-02T18:30:00.000Z"),
    });
  });
});
