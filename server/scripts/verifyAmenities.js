const jwt = require("jsonwebtoken");
const request = require("supertest");
const app = require("../src/app");
const env = require("../src/config/env");
const { Amenity, Room, RoomAmenity, sequelize } = require("../models");
const amenityMigration = require("../migrations/202607010002-room-amenities");

async function verifyAmenities() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const roomNumber = `AM-${suffix}`;
  const names = {
    wifi: `QA Wi-Fi ${suffix}`,
    ac: `QA AC ${suffix}`,
    tv: `QA TV ${suffix}`,
    fridge: `QA Mini Fridge ${suffix}`,
    parking: `QA Parking ${suffix}`,
    legacy: `QA Legacy Wi-Fi ${suffix}`,
  };
  const createdAmenityIds = [];
  let createdRoomId = null;
  let legacyRoomId = null;
  const checks = [];
  const adminToken = jwt.sign({ id: 0, role: "admin" }, env.jwtSecret, { expiresIn: "10m" });
  const customerToken = jwt.sign({ id: 0, role: "customer" }, env.jwtSecret, { expiresIn: "10m" });
  const admin = (method, path) => request(app)[method](path)
    .set("Authorization", `Bearer ${adminToken}`);

  try {
    const legacyRoom = await Room.create({
      room_number: `LEGACY-${suffix}`,
      name: `Legacy Amenity Room ${suffix}`,
      category: "Standard",
      description: "Temporary legacy JSON room used to verify migration backfill behavior.",
      base_price: 99999,
      capacity: 2,
      amenities: [names.legacy],
      images: [],
    });
    legacyRoomId = legacyRoom.id;
    await amenityMigration.up(sequelize.getQueryInterface(), require("sequelize"));
    const migratedAmenity = await Amenity.findOne({ where: { name: names.legacy } });
    const migratedLink = migratedAmenity
      ? await RoomAmenity.findOne({
        where: { room_id: legacyRoomId, amenity_id: migratedAmenity.id },
      })
      : null;
    if (!migratedAmenity || !migratedLink) {
      throw new Error("Legacy JSON amenities were not backfilled into the join table");
    }
    createdAmenityIds.push(migratedAmenity.id);
    checks.push("migration backfills legacy JSON amenities");

    const created = {};
    for (const key of ["wifi", "ac", "tv", "fridge", "parking"]) {
      const name = names[key];
      const response = await admin("post", "/api/admin/amenities").send({
        name,
        category: key === "tv" ? "Entertainment" : "Comfort",
        status: "active",
      });
      if (response.status !== 201) throw new Error(`Amenity create failed: ${response.text}`);
      created[key] = response.body.data;
      createdAmenityIds.push(response.body.data.id);
    }
    checks.push("admin creates amenity");

    const duplicate = await admin("post", "/api/admin/amenities").send({
      name: names.wifi.toLocaleLowerCase(),
      category: "Comfort",
      status: "active",
    });
    if (duplicate.status !== 409) throw new Error(`Duplicate was not blocked: ${duplicate.text}`);
    checks.push("case-insensitive duplicate blocked");

    const roomCreate = await admin("post", "/api/admin/rooms").send({
      room_number: roomNumber,
      name: `Amenity Test Room ${suffix}`,
      category: "Deluxe",
      description: "Temporary room used by the automated amenity verification flow.",
      base_price: 99999,
      capacity: 2,
      amenity_ids: [created.wifi.id, created.ac.id, created.tv.id],
      images: [],
    });
    if (roomCreate.status !== 201) throw new Error(`Room create failed: ${roomCreate.text}`);
    createdRoomId = roomCreate.body.data.id;
    if (roomCreate.body.data.amenity_details.length !== 3) {
      throw new Error("Created room did not return all selected amenities");
    }
    checks.push("room creates with selected amenities");

    const roomUpdate = await admin("put", `/api/admin/rooms/${createdRoomId}`).send({
      amenity_ids: [created.wifi.id, created.ac.id, created.fridge.id, created.parking.id],
    });
    if (roomUpdate.status !== 200) throw new Error(`Room update failed: ${roomUpdate.text}`);
    const updatedNames = roomUpdate.body.data.amenities;
    if (!updatedNames.includes(names.fridge) || !updatedNames.includes(names.parking) || updatedNames.includes(names.tv)) {
      throw new Error("Room amenity update did not add/remove the expected values");
    }
    checks.push("room edit adds and removes amenities");

    const publicList = await request(app).get("/api/rooms").query({ guests: 2, limit: 100 });
    const listedRoom = publicList.body.data?.find((room) => room.id === createdRoomId);
    if (publicList.status !== 200 || !listedRoom || listedRoom.amenity_details.length !== 4) {
      throw new Error("Public room list did not include selected amenities");
    }
    checks.push("public room list includes amenities");

    const publicDetail = await request(app).get(`/api/rooms/${createdRoomId}`).query({ guests: 2 });
    if (publicDetail.status !== 200 || publicDetail.body.data.amenity_details.length !== 4) {
      throw new Error("Public room detail did not include all selected amenities");
    }
    checks.push("public room detail includes full amenities");

    const deactivate = await admin("delete", `/api/admin/amenities/${created.parking.id}`);
    if (deactivate.status !== 200 || !deactivate.body.deactivated) {
      throw new Error("Used amenity was not safely deactivated");
    }
    const detailAfterDeactivate = await request(app).get(`/api/rooms/${createdRoomId}`);
    if (detailAfterDeactivate.body.data.amenities.includes(names.parking)) {
      throw new Error("Inactive amenity was exposed on the public room response");
    }
    checks.push("used amenity deactivates safely and is hidden publicly");

    const inactiveAssignment = await admin("post", "/api/admin/rooms").send({
      room_number: `BLOCK-${suffix}`,
      name: `Blocked Amenity Room ${suffix}`,
      category: "Standard",
      description: "Temporary room that must reject a newly assigned inactive amenity.",
      base_price: 99999,
      capacity: 2,
      amenity_ids: [created.parking.id],
      images: [],
    });
    if (inactiveAssignment.status !== 400) {
      throw new Error("A newly assigned inactive amenity was not rejected");
    }
    checks.push("inactive amenity cannot be newly assigned");

    const roomIds = await Room.findAll({ attributes: ["id"], order: [["id", "ASC"]] });
    let noAmenityRoom = null;
    for (const candidate of roomIds) {
      const linkCount = await RoomAmenity.count({ where: { room_id: candidate.id } });
      if (linkCount === 0) {
        noAmenityRoom = candidate;
        break;
      }
    }
    if (noAmenityRoom) {
      const emptyDetail = await request(app).get(`/api/rooms/${noAmenityRoom.id}`);
      if (emptyDetail.status !== 200 || !Array.isArray(emptyDetail.body.data.amenities)) {
        throw new Error("Room without amenities did not serialize safely");
      }
      checks.push("legacy room without amenities is safe");
    }

    const missingAuth = await request(app).get("/api/admin/amenities");
    const wrongRole = await request(app)
      .get("/api/admin/amenities")
      .set("Authorization", `Bearer ${customerToken}`);
    if (missingAuth.status !== 401 || wrongRole.status !== 403) {
      throw new Error("Amenity admin authorization checks failed");
    }
    checks.push("admin authorization enforced");

    console.log(JSON.stringify({ success: true, checks }, null, 2));
  } finally {
    if (createdRoomId) {
      await RoomAmenity.destroy({ where: { room_id: createdRoomId } });
      await Room.destroy({ where: { id: createdRoomId } });
    }
    if (legacyRoomId) {
      await RoomAmenity.destroy({ where: { room_id: legacyRoomId } });
      await Room.destroy({ where: { id: legacyRoomId } });
    }
    if (createdAmenityIds.length) {
      await Amenity.destroy({ where: { id: createdAmenityIds } });
    }
  }
}

verifyAmenities()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await sequelize.close();
    process.exit(1);
  });
