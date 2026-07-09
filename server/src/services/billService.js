const { Bill, Booking, Customer, HotelSetting, Room } = require("../../models");
const { billRefFromId } = require("../utils/billNumber");
const {
  assertExtensionPaymentsConfirmed,
  roundMoney,
  toExtensionPayload,
} = require("./extensionService");

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

  const extensions = await assertExtensionPaymentsConfirmed(booking.id, transaction);
  const extensionDetails = extensions
    .filter((request) => Number(request.extension_payable_amount ?? request.extra_amount ?? 0) > 0)
    .map(toExtensionPayload);
  const hotelSettings = await HotelSetting.findByPk(1, { transaction });
  const extraCharges = extras.reduce((sum, item) => sum + Number(item.amount || 0), 0) + Number(booking.extra_charges || 0);
  const subtotal = Number(booking.total_fare);
  const gstAmount = Number(booking.gst_amount);
  const bookingTotal = Number(
    Number(booking.final_payable_amount || 0) > 0
      ? booking.final_payable_amount
      : booking.total_amount
  );
  const totalAmount = Number((bookingTotal + extraCharges).toFixed(2));
  const totalExtensionAmount = roundMoney(
    extensionDetails.reduce((sum, item) => sum + item.extensionPayableAmount, 0)
  );
  const firstExtension = extensionDetails[0];
  const originalStayAmount = roundMoney(
    firstExtension?.original_booking_amount ?? Math.max(bookingTotal - totalExtensionAmount, 0)
  );
  const originalPaidAmount = roundMoney(
    firstExtension?.original_paid_amount ?? Math.min(Number(booking.amount_paid || 0), originalStayAmount)
  );
  const totalPaidAmount = roundMoney(booking.amount_paid || booking.advance_paid || 0);
  const remainingAmount = roundMoney(Math.max(totalAmount - totalPaidAmount, 0));

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
      base_amount: Number(booking.base_amount || 0),
      offer_discount_amount: Number(booking.offer_discount_amount ?? booking.discount_amount ?? 0),
      amount_after_offer: Number(booking.amount_after_offer || booking.total_fare || 0),
      applied_coupon_code: booking.applied_coupon_code || null,
      coupon_discount_amount: Number(booking.coupon_discount_amount || 0),
      final_payable_amount: bookingTotal,
      subtotal,
      extra_charges: extraCharges,
      gst_percent: booking.gst_percent,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      payment_method: booking.payment_method,
      payment_status: booking.payment_status,
      extras_json: extras,
      extension_json: extensionDetails,
      original_stay_amount: originalStayAmount,
      original_paid_amount: originalPaidAmount,
      total_paid_amount: totalPaidAmount,
      remaining_amount: remainingAmount,
      generated_at: new Date(),
    },
  };
}

async function generateBill(bookingId, extras = [], transaction, actor) {
  const { payload } = await buildBillData(bookingId, extras, transaction);
  const existing = await Bill.findOne({ where: { booking_id: bookingId }, transaction });
  let bill;
  if (existing) {
    await existing.update(payload, { transaction });
    bill = existing;
  } else {
    bill = await Bill.create({
      ...payload,
      bill_number: `TEMP-BILL-${Date.now()}-${bookingId}`,
    }, { transaction });
    const billNumber = billRefFromId(bill.id, new Date(bill.generated_at));
    await bill.update({ bill_number: billNumber }, { transaction });
  }
  const { writeAudit } = require("./auditService");
  const hasExtension = Array.isArray(payload.extension_json) && payload.extension_json.length > 0;
  await writeAudit({
    action: hasExtension ? "BILL_GENERATED_AFTER_EXTENSION" : "bill_generated",
    entityType: hasExtension ? "booking" : "bill",
    entityId: hasExtension ? bookingId : bill.id,
    actor: actor || { role: "system" },
    metadata: {
      bookingId,
      billId: bill.id,
      extensionRequestIds: hasExtension ? payload.extension_json.map((item) => item.id) : [],
      extensionAmount: hasExtension
        ? payload.extension_json.reduce((sum, item) => sum + Number(item.extensionPayableAmount || 0), 0)
        : 0,
    },
    transaction,
  });
  return bill;
}

module.exports = {
  buildBillData,
  generateBill,
};
