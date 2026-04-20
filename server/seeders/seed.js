const { sequelize } = require("../models");
const { syncDatabase } = require("../src/bootstrap/database");

async function seed() {
  try {
    await syncDatabase({ force: true, alter: false });
    console.log("Database initialized with tables and base system records only.");
  } finally {
    await sequelize.close();
  }
}

seed().catch((error) => {
  console.error("Seed failed", error);
  process.exit(1);
});

/*
const bcrypt = require("bcryptjs");
const {
  sequelize,
  Admin,
  Bill,
  Booking,
  Customer,
  CustomerHistory,
  Enquiry,
  Feedback,
  HotelSetting,
  Inventory,
  MaintenanceLog,
  Notification,
  Room,
  Staff,
  Task,
} = require("../models");
const { bookingRefFromId, billRefFromId } = require("../src/utils/billNumber");

function daysFromToday(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function makeImages(seed) {
  return [
    `https://res.cloudinary.com/demo/image/upload/v1700000000/panchavati/${seed}-1.jpg`,
    `https://res.cloudinary.com/demo/image/upload/v1700000000/panchavati/${seed}-2.jpg`,
    `https://res.cloudinary.com/demo/image/upload/v1700000000/panchavati/${seed}-3.jpg`,
    `https://res.cloudinary.com/demo/image/upload/v1700000000/panchavati/${seed}-4.jpg`,
    `https://res.cloudinary.com/demo/image/upload/v1700000000/panchavati/${seed}-5.jpg`,
  ];
}

async function seed() {
  await sequelize.sync({ force: true });

  const adminPassword = await bcrypt.hash("admin@123", 12);
  await Admin.create({
    full_name: "Admin Panchavati",
    email: "admin@panchavatgrand.in",
    phone: "+91-2530000000",
    password_hash: adminPassword,
  });

  await HotelSetting.create({
    id: 1,
    hotel_name: "Panchavati Grand",
    gst_percent: 12,
    address: "Near Ramkund Ghat, Panchavati, Nashik, Maharashtra 422003",
    phone: "+91-0253-4447777",
    email: "stay@panchavatgrand.in",
    bank_name: "State Bank of India",
    upi_id: "panchavatgrand@okaxis",
    gstin_number: "27AAAAA0000A1Z5",
    pan_number: "AAAAA0000A",
    whatsapp: "919999999999",
    cancellation_policy_text: "Free cancellation up to 48 hours before check-in. Late cancellations are charged one night.",
    late_checkout_fee: 800,
    extra_bed_charge: 500,
  });

  const staffSeed = [
    ["Sunil Jadhav", "receptionist", "sunil@pvhtel.in", "+91-9876500001", "recep@123"],
    ["Meena Kulkarni", "receptionist", "meena@pvhtel.in", "+91-9876500002", "recep@123"],
    ["Ganesh Pawar", "housekeeping", "ganesh@pvhtel.in", "+91-9876500003", "work@123"],
    ["Priya Deshmukh", "kitchen", "priya@pvhtel.in", "+91-9876500004", "work@123"],
    ["Rahul Shinde", "server", "rahul@pvhtel.in", "+91-9876500005", "work@123"],
  ];

  const staffMembers = [];
  for (const [full_name, role, email, phone, password] of staffSeed) {
    staffMembers.push(await Staff.create({
      full_name,
      role,
      email,
      phone,
      password_hash: await bcrypt.hash(password, 12),
      schedule_json: {
        monday: "08:00-16:00",
        tuesday: "08:00-16:00",
        wednesday: "08:00-16:00",
        thursday: "08:00-16:00",
        friday: "08:00-16:00",
        saturday: "10:00-18:00",
        sunday: "Off",
      },
    }));
  }

  const rooms = await Room.bulkCreate([
    {
      room_number: "101",
      name: "Godavari Standard I",
      category: "Standard",
      description: "A warm heritage-inspired room with cream walls, carved wood accents, and easy access to the ghats.",
      base_price: 1800,
      seasonal_price: 2500,
      seasonal_start: "2026-10-01",
      seasonal_end: "2027-03-31",
      total_units: 1,
      capacity: 2,
      amenities: ["AC", "WiFi", "TV", "Hot Water", "Room Service", "Tea/Coffee Maker"],
      images: makeImages("godavari-standard-1"),
      floor: 1,
      view_type: "City View",
      bed_type: "Queen",
      size_sqm: 24,
      nashik_landmark: "City view, 5 min walk to Ramkund Ghat",
    },
    {
      room_number: "102",
      name: "Godavari Standard II",
      category: "Standard",
      description: "Balanced comfort and local character with terracotta textiles and a quiet courtyard-facing window.",
      base_price: 1800,
      seasonal_price: 2500,
      seasonal_start: "2026-10-01",
      seasonal_end: "2027-03-31",
      total_units: 1,
      capacity: 2,
      amenities: ["AC", "WiFi", "TV", "Hot Water", "Room Service", "Tea/Coffee Maker"],
      images: makeImages("godavari-standard-2"),
      floor: 1,
      view_type: "City View",
      bed_type: "Queen",
      size_sqm: 24,
      nashik_landmark: "Near Panchavati lanes",
    },
    {
      room_number: "103",
      name: "Godavari Standard III",
      category: "Standard",
      description: "Soft saffron details and hand-loom textures shaped for pilgrim and leisure stays alike.",
      base_price: 1800,
      seasonal_price: 2500,
      seasonal_start: "2026-10-01",
      seasonal_end: "2027-03-31",
      total_units: 1,
      capacity: 2,
      amenities: ["AC", "WiFi", "TV", "Hot Water", "Room Service", "Tea/Coffee Maker"],
      images: makeImages("godavari-standard-3"),
      floor: 1,
      view_type: "Garden View",
      bed_type: "Queen",
      size_sqm: 24,
      nashik_landmark: "Courtyard-facing retreat",
    },
    {
      room_number: "104",
      name: "Godavari Standard IV",
      category: "Standard",
      description: "A straightforward, budget-friendly room with polished stone textures inspired by Hemadpanthi architecture.",
      base_price: 1800,
      seasonal_price: 2500,
      seasonal_start: "2026-10-01",
      seasonal_end: "2027-03-31",
      total_units: 1,
      capacity: 2,
      amenities: ["AC", "WiFi", "TV", "Hot Water", "Room Service", "Tea/Coffee Maker"],
      images: makeImages("godavari-standard-4"),
      floor: 1,
      view_type: "City View",
      bed_type: "Queen",
      size_sqm: 24,
      nashik_landmark: "Temple quarter skyline",
    },
    {
      room_number: "201",
      name: "Panchavati Deluxe I",
      category: "Deluxe",
      description: "Refined deluxe room with gold accents, balcony seating, and a partial Godavari view.",
      base_price: 3200,
      seasonal_price: 4500,
      seasonal_start: "2026-10-01",
      seasonal_end: "2027-03-31",
      discount_pct: 10,
      discount_start: daysFromToday(5),
      discount_end: daysFromToday(25),
      total_units: 1,
      capacity: 3,
      amenities: ["AC", "WiFi", "Smart TV", "Rain Shower", "Mini Fridge", "Balcony", "Room Service"],
      images: makeImages("panchavati-deluxe-1"),
      floor: 2,
      view_type: "Godavari View",
      bed_type: "King",
      size_sqm: 30,
      nashik_landmark: "Godavari River partial view",
    },
    {
      room_number: "202",
      name: "Panchavati Deluxe II",
      category: "Deluxe",
      description: "A polished deluxe stay blending Maharashtrian detailing with smart-room convenience.",
      base_price: 3200,
      seasonal_price: 4500,
      seasonal_start: "2026-10-01",
      seasonal_end: "2027-03-31",
      total_units: 1,
      capacity: 3,
      amenities: ["AC", "WiFi", "Smart TV", "Rain Shower", "Mini Fridge", "Balcony", "Room Service"],
      images: makeImages("panchavati-deluxe-2"),
      floor: 2,
      view_type: "City View",
      bed_type: "King",
      size_sqm: 30,
      nashik_landmark: "Near Panchavati Temple axis",
    },
    {
      room_number: "203",
      name: "Panchavati Deluxe III",
      category: "Deluxe",
      description: "Ideal for couples wanting a little more room and a richer Nashik-inspired ambience.",
      base_price: 3200,
      seasonal_price: 4500,
      seasonal_start: "2026-10-01",
      seasonal_end: "2027-03-31",
      total_units: 1,
      capacity: 3,
      amenities: ["AC", "WiFi", "Smart TV", "Rain Shower", "Mini Fridge", "Balcony", "Room Service"],
      images: makeImages("panchavati-deluxe-3"),
      floor: 2,
      view_type: "Garden View",
      bed_type: "King",
      size_sqm: 30,
      nashik_landmark: "Quiet courtyard and temple bell ambience",
    },
    {
      room_number: "301",
      name: "Nashik Family Suite I",
      category: "Family",
      description: "Large family suite with connected sleeping zones and Sahyadri-facing windows.",
      base_price: 4500,
      seasonal_price: 6500,
      seasonal_start: "2026-10-01",
      seasonal_end: "2027-03-31",
      total_units: 1,
      capacity: 4,
      amenities: ["AC", "WiFi", "2 Smart TVs", "Bathtub", "Dining Area", "Kids Amenities kit"],
      images: makeImages("family-suite-1"),
      floor: 3,
      view_type: "Mountain View",
      bed_type: "King + Twin",
      size_sqm: 46,
      nashik_landmark: "2 connecting rooms, Sahyadri mountain view",
    },
    {
      room_number: "302",
      name: "Nashik Family Suite II",
      category: "Family",
      description: "Spacious multi-guest suite built for festival travel and long-stay comfort.",
      base_price: 4500,
      seasonal_price: 6500,
      seasonal_start: "2026-10-01",
      seasonal_end: "2027-03-31",
      total_units: 1,
      capacity: 4,
      amenities: ["AC", "WiFi", "2 Smart TVs", "Bathtub", "Dining Area", "Kids Amenities kit"],
      images: makeImages("family-suite-2"),
      floor: 3,
      view_type: "Mountain View",
      bed_type: "King + Twin",
      size_sqm: 46,
      nashik_landmark: "Family wing overlooking Sahyadri ridge",
    },
    {
      room_number: "401",
      name: "Kumbh Presidential Suite",
      category: "Presidential",
      description: "Our signature suite with panoramic Nashik views, a private balcony, jacuzzi, and curated wine welcome hamper.",
      base_price: 9000,
      seasonal_price: 14000,
      seasonal_start: "2026-10-01",
      seasonal_end: "2027-03-31",
      total_units: 1,
      capacity: 2,
      amenities: ["AC", "Ultra-fast WiFi", "OLED Smart TV", "Jacuzzi", "Kitchenette", "Private Balcony", "Nashik Wine Welcome Hamper", "Concierge", "Airport Transfer"],
      images: makeImages("presidential-suite"),
      floor: 4,
      view_type: "Panoramic View",
      bed_type: "King",
      size_sqm: 72,
      nashik_landmark: "360° view — Godavari + Sahyadri + city panorama",
    },
  ]);

  const customers = await Customer.bulkCreate([
    {
      full_name: "Aarav Patil",
      email: "aarav@example.com",
      phone: "+919876543210",
      password_hash: await bcrypt.hash("guest@123", 12),
      nationality: "India",
      id_type: "national_id",
      id_number: "XXXX-XXXX-4321",
      otp_verified: true,
    },
    {
      full_name: "Sarah Johnson",
      email: "sarah@example.com",
      phone: "+918888777666",
      password_hash: await bcrypt.hash("guest@123", 12),
      nationality: "USA",
      id_type: "passport",
      id_number: "P1234567",
      id_expiry: "2029-06-30",
      otp_verified: true,
    },
    {
      full_name: "Pranali Deshpande",
      email: "pranali@example.com",
      phone: "+917777666555",
      password_hash: await bcrypt.hash("guest@123", 12),
      nationality: "India",
      id_type: "driving_license",
      id_number: "MH15-2023-11111",
      otp_verified: true,
    },
  ]);

  const bookingRecords = [
    {
      customer_id: customers[0].id,
      room_id: rooms[4].id,
      check_in: daysFromToday(3),
      check_out: daysFromToday(6),
      nights: 3,
      guests: 2,
      fare_per_night: 3200,
      total_fare: 9600,
      gst_percent: 12,
      gst_amount: 1152,
      total_amount: 10752,
      payment_method: "online",
      payment_status: "paid",
      status: "confirmed",
      booked_by: "customer",
      special_requests: "High floor and vegetarian breakfast",
    },
    {
      customer_id: customers[1].id,
      room_id: rooms[7].id,
      check_in: daysFromToday(-12),
      check_out: daysFromToday(-9),
      nights: 3,
      guests: 4,
      fare_per_night: 4500,
      total_fare: 13500,
      gst_percent: 12,
      gst_amount: 1620,
      total_amount: 15120,
      payment_method: "online",
      payment_status: "paid",
      status: "checked_out",
      booked_by: "customer",
      special_requests: "Airport transfer",
      actual_checkin_time: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
      actual_checkout_time: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000),
      id_verified: true,
    },
    {
      customer_id: customers[2].id,
      room_id: rooms[1].id,
      check_in: daysFromToday(10),
      check_out: daysFromToday(12),
      nights: 2,
      guests: 2,
      fare_per_night: 1800,
      total_fare: 3600,
      gst_percent: 12,
      gst_amount: 432,
      total_amount: 4032,
      payment_method: "online",
      payment_status: "refunded",
      status: "cancelled",
      booked_by: "customer",
      cancellation_reason: "Change of plans",
      cancelled_at: new Date(),
    },
    {
      customer_id: customers[0].id,
      room_id: rooms[5].id,
      check_in: daysFromToday(0),
      check_out: daysFromToday(2),
      nights: 2,
      guests: 2,
      fare_per_night: 3200,
      total_fare: 6400,
      gst_percent: 12,
      gst_amount: 768,
      total_amount: 7168,
      payment_method: "pay_later",
      payment_status: "pay_at_hotel",
      status: "confirmed",
      booked_by: "customer",
      special_requests: "Early check-in if possible",
    },
    {
      customer_id: customers[2].id,
      room_id: rooms[9].id,
      check_in: daysFromToday(-1),
      check_out: daysFromToday(1),
      nights: 2,
      guests: 2,
      fare_per_night: 9000,
      total_fare: 18000,
      gst_percent: 12,
      gst_amount: 2160,
      total_amount: 20160,
      payment_method: "upi",
      payment_status: "paid",
      status: "checked_in",
      booked_by: "receptionist",
      actual_checkin_time: new Date(Date.now() - 12 * 60 * 60 * 1000),
      id_verified: true,
    },
  ];

  const bookings = [];
  for (const record of bookingRecords) {
    const booking = await Booking.create(record);
    await booking.update({ booking_ref: bookingRefFromId(booking.id, new Date()) });
    bookings.push(booking);
  }

  rooms[9].status = "occupied";
  await rooms[9].save();
  rooms[7].status = "cleaning";
  await rooms[7].save();

  const bill = await Bill.create({
    booking_id: bookings[1].id,
    bill_number: billRefFromId(1, new Date()),
    cust_name: customers[1].full_name,
    cust_phone: customers[1].phone,
    cust_email: customers[1].email,
    room_number: rooms[7].room_number,
    category: rooms[7].category,
    check_in: bookings[1].check_in,
    check_out: bookings[1].check_out,
    nights: bookings[1].nights,
    fare_per_night: bookings[1].fare_per_night,
    subtotal: bookings[1].total_fare,
    extra_charges: 500,
    gst_percent: bookings[1].gst_percent,
    gst_amount: bookings[1].gst_amount,
    total_amount: Number(bookings[1].total_amount) + 500,
    payment_method: bookings[1].payment_method,
    payment_status: bookings[1].payment_status,
    extras_json: [{ title: "Airport transfer", amount: 500 }],
  });

  await CustomerHistory.create({
    booking_id: bookings[1].id,
    customer_id: customers[1].id,
    cust_name: customers[1].full_name,
    phone: customers[1].phone,
    room_number: rooms[7].room_number,
    category: rooms[7].category,
    check_in: bookings[1].check_in,
    check_out: bookings[1].check_out,
    nights: bookings[1].nights,
    amount: bill.total_amount,
    status: "checked_out",
    feedback_given: true,
  });

  await Inventory.bulkCreate([
    { item_name: "Bed Sheets", category: "linen", quantity: 45, unit: "pcs", reorder_level: 20, supplier: "Nashik Linen Works", cost_per_unit: 350 },
    { item_name: "Pillow Covers", category: "linen", quantity: 60, unit: "pcs", reorder_level: 30, supplier: "Nashik Linen Works", cost_per_unit: 85 },
    { item_name: "Bath Towels", category: "linen", quantity: 28, unit: "pcs", reorder_level: 20, supplier: "Sahyadri Textiles", cost_per_unit: 220 },
    { item_name: "Duvet Covers", category: "linen", quantity: 22, unit: "pcs", reorder_level: 10, supplier: "Sahyadri Textiles", cost_per_unit: 480 },
    { item_name: "Soap", category: "toiletries", quantity: 8, unit: "boxes", reorder_level: 20, supplier: "Panchavati Supplies", cost_per_unit: 18 },
    { item_name: "Shampoo Sachets", category: "toiletries", quantity: 25, unit: "boxes", reorder_level: 15, supplier: "Panchavati Supplies", cost_per_unit: 12 },
    { item_name: "Toothbrush Kits", category: "toiletries", quantity: 18, unit: "kits", reorder_level: 12, supplier: "Panchavati Supplies", cost_per_unit: 20 },
    { item_name: "Nashik Wine Bottles", category: "beverage", quantity: 15, unit: "bottles", reorder_level: 10, supplier: "Sula Vineyards", cost_per_unit: 650 },
    { item_name: "Breakfast Tea Packets", category: "food", quantity: 25, unit: "packs", reorder_level: 12, supplier: "Maharashtra Foods", cost_per_unit: 60 },
    { item_name: "Floor Cleaner", category: "cleaning", quantity: 6, unit: "canisters", reorder_level: 10, supplier: "CleanNest", cost_per_unit: 230 },
    { item_name: "Glass Cleaner", category: "cleaning", quantity: 12, unit: "sprays", reorder_level: 8, supplier: "CleanNest", cost_per_unit: 110 },
    { item_name: "Light Bulbs", category: "maintenance", quantity: 35, unit: "pcs", reorder_level: 25, supplier: "Deccan Electricals", cost_per_unit: 90 },
  ]);

  await Feedback.bulkCreate([
    {
      customer_id: customers[1].id,
      booking_id: bookings[1].id,
      cust_name: customers[1].full_name,
      rating: 5,
      title: "Beautiful riverside hospitality",
      comment: "The family suite felt thoughtful and warm, and the staff helped us plan our Godavari visit beautifully.",
      room_category: "Family",
      status: "published",
      photos: makeImages("review-family").slice(0, 2),
    },
    {
      customer_id: customers[0].id,
      booking_id: bookings[0].id,
      cust_name: customers[0].full_name,
      rating: 4,
      title: "Great for temple visit",
      comment: "Very close to Panchavati and Ramkund, with quick service and a clean balcony room.",
      room_category: "Deluxe",
      status: "published",
    },
    {
      customer_id: customers[2].id,
      booking_id: bookings[4].id,
      cust_name: customers[2].full_name,
      rating: 5,
      title: "Luxury stay",
      comment: "The presidential suite view is stunning and the welcome hamper was a lovely Nashik touch.",
      room_category: "Presidential",
      status: "pending",
    },
    {
      customer_id: customers[0].id,
      booking_id: bookings[3].id,
      cust_name: customers[0].full_name,
      rating: 4,
      title: "Smooth check-in support",
      comment: "Reception was helpful and the pay-at-hotel option made planning much easier for our family trip.",
      room_category: "Deluxe",
      status: "pending",
    },
  ]);

  await Enquiry.bulkCreate([
    {
      full_name: "Nikita Joshi",
      phone: "+919999000001",
      email: "nikita@example.com",
      check_in: daysFromToday(20),
      check_out: daysFromToday(22),
      adults: 2,
      room_category: "Deluxe",
      message: "Do you have a package for a wine tour stay?",
      source: "website",
      is_responded: true,
      response_text: "Yes, we have a Sula vineyard package and our team will call you shortly.",
      responded_by_staff_id: staffMembers[0].id,
    },
    {
      full_name: "Raj Malhotra",
      phone: "+919999000002",
      email: "raj@example.com",
      check_in: daysFromToday(7),
      check_out: daysFromToday(10),
      adults: 3,
      room_category: "Family",
      message: "Need a family room near the ghats for a religious visit.",
      source: "website",
    },
    {
      full_name: "Amina Khan",
      phone: "+919999000003",
      email: "amina@example.com",
      check_in: daysFromToday(30),
      check_out: daysFromToday(33),
      adults: 2,
      room_category: "Presidential",
      message: "Can the suite include airport pickup and early breakfast?",
      source: "website",
    },
  ]);

  await Task.bulkCreate([
    {
      staff_id: staffMembers[2].id,
      title: "Clean and reset room 302",
      description: "Prepare the family suite after guest departure.",
      room_number: "302",
      task_type: "cleaning",
      priority: "high",
      status: "pending",
      due_time: new Date(Date.now() + 2 * 60 * 60 * 1000),
    },
    {
      staff_id: staffMembers[2].id,
      title: "Inspect minibar in room 401",
      description: "Verify premium hamper stock for current VIP guest.",
      room_number: "401",
      task_type: "inspection",
      priority: "normal",
      status: "in_progress",
      due_time: new Date(Date.now() + 60 * 60 * 1000),
    },
    {
      staff_id: staffMembers[3].id,
      title: "Prepare Maharashtrian breakfast",
      description: "Kitchen prep for temple-tour group breakfast order.",
      task_type: "service",
      priority: "normal",
      status: "pending",
      due_time: new Date(Date.now() + 3 * 60 * 60 * 1000),
    },
    {
      staff_id: staffMembers[4].id,
      title: "Deliver welcome hamper",
      description: "Send wine welcome kit to room 401.",
      room_number: "401",
      task_type: "delivery",
      priority: "high",
      status: "pending",
      due_time: new Date(Date.now() + 30 * 60 * 1000),
    },
    {
      staff_id: staffMembers[2].id,
      title: "Check lobby brass lamps",
      description: "Ensure evening aarti ambiance setup is ready.",
      task_type: "inspection",
      priority: "low",
      status: "done",
      completed_at: new Date(Date.now() - 90 * 60 * 1000),
    },
  ]);

  await MaintenanceLog.bulkCreate([
    {
      room_id: rooms[2].id,
      reported_by_staff_id: staffMembers[0].id,
      assigned_to_staff_id: staffMembers[2].id,
      title: "AC not cooling",
      description: "Guest reported low cooling in room 103.",
      priority: "high",
      status: "in_progress",
    },
    {
      room_id: rooms[6].id,
      reported_by_staff_id: staffMembers[1].id,
      title: "Balcony light flicker",
      description: "Exterior fixture needs replacement.",
      priority: "medium",
      status: "open",
    },
  ]);

  await Notification.bulkCreate([
    {
      target_role: "customer",
      target_id: customers[0].id,
      title: "Upcoming Stay Reminder",
      message: `Your stay ${bookings[0].booking_ref} starts soon.`,
      type: "booking",
    },
    {
      target_role: "all",
      title: "Kumbh Package Live",
      message: "Special Kumbh Mela package is now available for direct bookings.",
      type: "system",
    },
  ]);

  console.log("Seed complete");
  await sequelize.close();
}

seed().catch(async (error) => {
  console.error("Seed failed", error);
  await sequelize.close();
  process.exit(1);
});
*/
