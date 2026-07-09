const { Bill, Booking, HotelSetting } = require("../../../models");
const { generateBill, buildBillData } = require("../../services/billService");
const { createBillPdfBuffer } = require("../../services/pdfService");

async function generateBookingBill(req, res) {
  const bill = await generateBill(req.body.booking_id, req.body.extras || [], undefined, req.user);
  return res.status(201).json({
    success: true,
    data: bill,
    message: "Bill generated successfully",
  });
}

async function getBookingBill(req, res) {
  await buildBillData(req.params.bookingId, []);
  const bill = await Bill.findOne({
    where: { booking_id: req.params.bookingId },
    include: [{ model: Booking, as: "booking" }],
  });

  if (!bill) {
    return res.status(404).json({ success: false, error: "Bill not found" });
  }

  return res.json({ success: true, data: bill });
}

async function downloadBookingBill(req, res) {
  const { booking, hotelSettings, payload } = await buildBillData(req.params.bookingId, []);
  const bill = await Bill.findOne({ where: { booking_id: req.params.bookingId } }) || payload;
  const settings = hotelSettings || await HotelSetting.findByPk(1);
  const buffer = await createBillPdfBuffer({ bill, hotelSettings: settings, booking });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${bill.bill_number || booking.booking_ref}.pdf"`);
  return res.send(buffer);
}

module.exports = {
  generateBookingBill,
  getBookingBill,
  downloadBookingBill,
};
