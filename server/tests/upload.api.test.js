const express = require("express");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const env = require("../src/config/env");
const uploadRoutes = require("../src/routes/upload");

function adminToken() {
  return jwt.sign({ id: 1, role: "admin", name: "Admin" }, env.jwtSecret);
}

describe("Upload API hardening", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use("/api/upload", uploadRoutes);
    app.use((error, req, res, next) => {
      res.status(error.status || 500).json({ success: false, error: error.message });
    });
  });

  it("rejects spoofed image files based on signature", async () => {
    const response = await request(app)
      .post("/api/upload/image")
      .set("Authorization", `Bearer ${adminToken()}`)
      .attach("image", Buffer.from("this-is-not-a-real-image"), {
        filename: "spoofed.jpg",
        contentType: "image/jpeg",
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toMatch(/Invalid image file signature|Only JPEG, PNG, and WebP/i);
  });
});

