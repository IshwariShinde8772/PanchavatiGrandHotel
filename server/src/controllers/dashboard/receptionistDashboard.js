const { Op } = require("sequelize");
const { Booking, Room, Customer } = require("../../../models");

async function getReceptionistDashboard(req, res) {
  const today = new Date().toISOString().slice(0, 10);
  const [arrivals, departures, occupiedRooms, pendingPayments, recentBookings] = await Promise.all([
    Booking.findAll({ 
      where: { check_in: today, status: { [Op.in]: ["confirmed", "pending"] } },
      include: [
        { model: Customer, as: "customer", attributes: ["full_name", "phone"] },
        { model: Room, as: "room", attributes: ["room_number", "category"] }
      ]
    }),
    Booking.findAll({ 
      where: { check_out: today, status: { [Op.in]: ["checked_in", "confirmed"] } },
      include: [
        { model: Customer, as: "customer", attributes: ["full_name", "phone"] },
        { model: Room, as: "room", attributes: ["room_number", "category"] }
      ]
    }),
    Room.count({ where: { status: "occupied" } }),
    Booking.count({
      where: {
        payment_status: { [Op.in]: ["pending", "pay_at_hotel"] },
        status: { [Op.in]: ["confirmed", "checked_in"] },
      },
    }),
    Booking.findAll({
      limit: 10,
      order: [["created_at", "DESC"]],
      include: [
        { model: Customer, as: "customer", attributes: ["full_name", "phone"] },
        { model: Room, as: "room", attributes: ["room_number", "category"] }
      ]
    }),
  ]);

  return res.json({
    success: true,
    data: {
      stats: {
        check_ins_today: arrivals.length,
        check_outs_today: departures.length,
        occupied_rooms: occupiedRooms,
        pending_payments: pendingPayments,
      },
      arrivals,
      departures,
      recentBookings,
    },
  });
}

module.exports = { getReceptionistDashboard };
