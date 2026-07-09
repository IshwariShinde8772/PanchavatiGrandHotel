jest.mock("../models", () => ({
  Room: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
  },
  Booking: {
    count: jest.fn(),
  },
  Task: {
    count: jest.fn(),
    update: jest.fn(),
  },
  HotelSetting: {},
  sequelize: {
    transaction: jest.fn(),
  },
}));

const {
  Booking,
  Room,
  Task,
  sequelize,
} = require("../models");
const {
  getRoomGrid,
  markRoomCleaned,
} = require("../src/controllers/room/roomController");

function response() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

function roomRecord({ id, status, bookings = [], tasks = [] }) {
  const plain = {
    id,
    room_number: String(100 + id),
    category: "Standard",
    status,
    is_active: true,
    amenities: [],
    images: [],
    bookings,
    tasks,
  };
  return {
    ...plain,
    get: jest.fn(() => ({ ...plain })),
  };
}

describe("receptionist room status flow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps room-grid priority as maintenance, occupied, cleaning, available", async () => {
    Room.findAll.mockResolvedValue([
      roomRecord({
        id: 1,
        status: "maintenance",
        bookings: [{ id: 1, status: "checked_in" }],
        tasks: [{ id: 1, status: "pending", task_type: "cleaning" }],
      }),
      roomRecord({
        id: 2,
        status: "cleaning",
        bookings: [{ id: 2, status: "checked_in" }],
        tasks: [{ id: 2, status: "pending", task_type: "cleaning" }],
      }),
      roomRecord({
        id: 3,
        status: "available",
        tasks: [{ id: 3, status: "pending", task_type: "cleaning" }],
      }),
      roomRecord({ id: 4, status: "available" }),
    ]);
    const res = response();

    await getRoomGrid({}, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.data.map((item) => item.status)).toEqual([
      "maintenance",
      "occupied",
      "cleaning",
      "available",
    ]);
    expect(payload.data.map((item) => item.is_bookable)).toEqual([
      false,
      false,
      false,
      true,
    ]);
  });

  it("marks a cleaning room and its pending cleaning task complete", async () => {
    const transaction = { LOCK: { UPDATE: "UPDATE" } };
    sequelize.transaction.mockImplementation(async (callback) => callback(transaction));
    const room = {
      id: 9,
      status: "cleaning",
      amenities: [],
      images: [],
      update: jest.fn(async (values) => Object.assign(room, values)),
    };
    Room.findByPk.mockResolvedValue(room);
    Booking.count.mockResolvedValue(0);
    Task.count.mockResolvedValue(1);
    Task.update.mockResolvedValue([1]);
    const res = response();

    await markRoomCleaned({ params: { id: "9" } }, res);

    expect(Task.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "done", completed_at: expect.any(Date) }),
      expect.objectContaining({ transaction })
    );
    expect(room.update).toHaveBeenCalledWith({ status: "available" }, { transaction });
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ status: "available" }),
    }));
  });

  it("does not let an occupied room become available through mark cleaned", async () => {
    const transaction = { LOCK: { UPDATE: "UPDATE" } };
    sequelize.transaction.mockImplementation(async (callback) => callback(transaction));
    Room.findByPk.mockResolvedValue({
      id: 10,
      status: "cleaning",
      update: jest.fn(),
    });
    Booking.count.mockResolvedValue(1);

    await expect(markRoomCleaned(
      { params: { id: "10" } },
      response()
    )).rejects.toMatchObject({
      status: 409,
      message: "An occupied room cannot be marked available",
    });
    expect(Task.update).not.toHaveBeenCalled();
  });
});
