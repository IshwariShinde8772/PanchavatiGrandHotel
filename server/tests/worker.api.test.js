const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const env = require("../src/config/env");
const authMiddleware = require("../src/middleware/authMiddleware");
const roleGuard = require("../src/middleware/roleGuard");

jest.mock("../models", () => ({
  Task: {
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  MaintenanceLog: {
    create: jest.fn(),
    findByPk: jest.fn(),
  },
  Staff: {
    findByPk: jest.fn(),
  },
  Room: {},
}));

jest.mock("../src/services/maintenanceService", () => ({
  buildMaintenancePayload: jest.fn(),
  serializeMaintenanceLog: jest.fn(),
}));

const workerRoutes = require("../src/routes/worker");
const { Task, MaintenanceLog, Staff } = require("../models");
const { buildMaintenancePayload, serializeMaintenanceLog } = require("../src/services/maintenanceService");

function tokenFor(role, id = 17) {
  return jwt.sign({ id, role, name: "Test User" }, env.jwtSecret);
}

function makeTask(plain) {
  return {
    ...plain,
    get: () => plain,
  };
}

describe("Worker API", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/api/worker", authMiddleware, roleGuard(["housekeeping", "kitchen", "server"]), workerRoutes);
    app.use((error, req, res, next) => {
      res.status(error.status || 500).json({ success: false, error: error.message });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();

    Task.findAll.mockResolvedValue([
      makeTask({
        id: 1,
        title: "Prepare room 101",
        room_number: "101",
        task_type: "cleaning",
        priority: "high",
        status: "pending",
        notes: "Carry linen set B",
        due_time: null,
        room: { room_number: "101" },
      }),
    ]);

    const taskRecord = {
      id: 1,
      staff_id: 17,
      status: "pending",
      notes: "Carry linen set B",
      completed_at: null,
      update: jest.fn().mockResolvedValue(true),
    };
    Task.findOne.mockResolvedValue(taskRecord);

    Staff.findByPk.mockResolvedValue({
      schedule_json: {
        monday: "08:00-16:00",
        tuesday: "08:00-16:00",
      },
    });

    buildMaintenancePayload.mockResolvedValue({
      room_number: "101",
      title: "Tap leak",
      description: "Tap is leaking in washroom",
      priority: "high",
      reported_by_staff_id: 17,
      status: "open",
    });
    MaintenanceLog.create.mockResolvedValue({ id: 55 });
    MaintenanceLog.findByPk.mockResolvedValue({ id: 55, title: "Tap leak" });
    serializeMaintenanceLog.mockReturnValue({ id: 55, title: "Tap leak" });
  });

  it("blocks worker routes without authentication", async () => {
    const response = await request(app).get("/api/worker/tasks");
    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it("blocks worker routes for disallowed roles", async () => {
    const response = await request(app)
      .get("/api/worker/tasks")
      .set("Authorization", `Bearer ${tokenFor("receptionist")}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it("lists worker tasks for allowed role", async () => {
    const response = await request(app)
      .get("/api/worker/tasks")
      .set("Authorization", `Bearer ${tokenFor("housekeeping")}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data[0]).toMatchObject({
      title: "Prepare room 101",
      room_number: "101",
      task_type: "cleaning",
      priority: "high",
      status: "pending",
    });
  });

  it("updates worker task status", async () => {
    const response = await request(app)
      .patch("/api/worker/tasks/1")
      .set("Authorization", `Bearer ${tokenFor("kitchen")}`)
      .send({ status: "in_progress", notes: "Started now" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Task.findOne).toHaveBeenCalled();
  });

  it("returns worker schedule data", async () => {
    const response = await request(app)
      .get("/api/worker/schedule")
      .set("Authorization", `Bearer ${tokenFor("server")}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      monday: "08:00-16:00",
    });
  });

  it("creates maintenance issue from worker portal", async () => {
    const response = await request(app)
      .post("/api/worker/issues")
      .set("Authorization", `Bearer ${tokenFor("housekeeping")}`)
      .send({
        room_number: "101",
        title: "Tap leak",
        description: "Tap is leaking in washroom",
        priority: "high",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(buildMaintenancePayload).toHaveBeenCalled();
    expect(MaintenanceLog.create).toHaveBeenCalled();
  });
});

