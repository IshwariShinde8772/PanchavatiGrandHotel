const { Bill, Booking, Customer, HotelSetting, Room } = require("../../models");
const { billRefFromId } = require("../utils/billNumber");

async function buildBillData(bookingId, extras = [], transaction) {
  const booking = await Booking.findByPk(bookingId, {
    include: [
      { model: Customer, as: "customer" },
      { model: Room, as: "room" },
    ],
    transaction,
  });

  if (!booking) {
    const error = new Error("Booking not found");
    error.status = 404;
    throw error;
  }

  const hotelSettings = await HotelSetting.findByPk(1, { transaction });
  const extraCharges = extras.reduce((sum, item) => sum + Number(item.amount || 0), 0) + Number(booking.extra_charges || 0);
  const subtotal = Number(booking.total_fare);
  const gstAmount = Number(booking.gst_amount);
  const totalAmount = Number((subtotal + extraCharges + gstAmount).toFixed(2));

  return {
    booking,
    hotelSettings,
    payload: {
      booking_id: booking.id,
      cust_name: booking.customer.full_name,
      cust_phone: booking.customer.phone,
      cust_email: booking.customer.email,
      room_number: booking.room.room_number,
      category: booking.room.category,
      check_in: booking.check_in,
      check_out: booking.check_out,
      nights: booking.nights,
      fare_per_night: booking.fare_per_night,
      subtotal,
      extra_charges: extraCharges,
      gst_percent: booking.gst_percent,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      payment_method: booking.payment_method,
      payment_status: booking.payment_status,
      extras_json: extras,
      generated_at: new Date(),
    },
  };
}

async function generateBill(bookingId, extras = [], transaction) {
  const existing = await Bill.findOne({ where: { booking_id: bookingId }, transaction });
  if (existing) {
    return existing;
  }

  const { payload } = await buildBillData(bookingId, extras, transaction);
  const created = await Bill.create({
    ...payload,
    bill_number: `TEMP-BILL-${Date.now()}-${bookingId}`,
  }, { transaction });
  const billNumber = billRefFromId(created.id, new Date(created.generated_at));
  await created.update({ bill_number: billNumber }, { transaction });
  return created;
}

module.exports = {
  buildBillData,
  generateBill,
};
