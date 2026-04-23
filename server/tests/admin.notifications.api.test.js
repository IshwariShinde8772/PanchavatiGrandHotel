const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const env = require("../src/config/env");
const authMiddleware = require("../src/middleware/authMiddleware");
const roleGuard = require("../src/middleware/roleGuard");

jest.mock("../models", () => ({
  Notification: {
    findAll: jest.fn(),
    create: jest.fn(),
    findByPk: jest.fn(),
  },
}));

const { Notification } = require("../models");
const {
  listNotifications,
  createNotification,
  markNotificationRead,
  deleteNotification,
} = require("../src/controllers/notification/notificationController");

function tokenFor(role, id = 1) {
  return jwt.sign({ id, role, name: "Admin User" }, env.jwtSecret);
}

describe("Admin notifications API", () => {
  let app;

  beforeAll(() => {
    const router = express.Router();
    router.get("/", listNotifications);
    router.post("/", createNotification);
    router.patch("/:id/read", markNotificationRead);
    router.delete("/:id", deleteNotification);

    app = express();
    app.use(express.json());
    app.use("/api/admin/notifications", authMiddleware, roleGuard(["admin"]), router);
    app.use((error, req, res, next) => {
      res.status(error.status || 500).json({ success: false, error: error.message });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lists notifications with filters", async () => {
    Notification.findAll.mockResolvedValue([
      {
        id: 1,
        target_role: "receptionist",
        type: "task",
        title: "Queue update",
        message: "Cleaning queue has new item",
        is_read: false,
      },
    ]);

    const response = await request(app)
      .get("/api/admin/notifications?target_role=receptionist&type=task&unreadOnly=true&limit=10")
      .set("Authorization", `Bearer ${tokenFor("admin")}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Notification.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          target_role: "receptionist",
          type: "task",
          is_read: false,
        }),
        limit: 10,
      })
    );
  });

  it("creates a notification", async () => {
    Notification.create.mockResolvedValue({
      id: 22,
      target_role: "customer",
      target_id: 99,
      type: "system",
      title: "Welcome",
      message: "Thanks for staying with us",
    });

    const response = await request(app)
      .post("/api/admin/notifications")
      .set("Authorization", `Bearer ${tokenFor("admin")}`)
      .send({
        target_role: "customer",
        target_id: 99,
        type: "system",
        title: "Welcome",
        message: "Thanks for staying with us",
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(Notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        target_role: "customer",
        target_id: 99,
        type: "system",
      })
    );
  });
});

