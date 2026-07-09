const PDFDocument = require("pdfkit");
const { formatISTDateTimeForReport } = require("../utils/dateHelpers");

function money(value) {
  return Number(value || 0).toFixed(2);
}

function parseExtensions(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function createBillPdfBuffer({ bill, hotelSettings, booking }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text(hotelSettings.hotel_name || "Panchavati Grand", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).text(hotelSettings.address || "Nashik, Maharashtra", { align: "center" });
    doc.text(`Phone: ${hotelSettings.phone || "-"} | GSTIN: ${hotelSettings.gstin_number || "-"}`, { align: "center" });

    doc.moveDown(1.5);
    doc.fontSize(14).text(`Bill No: ${bill.bill_number}`);
    doc.fontSize(12).text(`Booking Ref: ${booking.booking_ref}`);
    doc.text(`Guest: ${bill.cust_name}`);
    doc.text(`Room: ${bill.room_number} (${bill.category})`);
    doc.text(`Stay: ${bill.check_in} to ${bill.check_out} (${bill.nights} nights)`);
    doc.text(`Generated: ${formatISTDateTimeForReport(bill.generated_at)}`);
    if (booking.actual_checkout_time) {
      doc.text(`Actual check-out: ${formatISTDateTimeForReport(booking.actual_checkout_time)}`);
    }

    doc.moveDown(1);
    const extensions = parseExtensions(bill.extension_json);
    doc.text(`Fare per night: INR ${money(bill.fare_per_night)}`);
    doc.text(`Base room amount: INR ${money(bill.base_amount ?? booking.base_amount ?? bill.subtotal)}`);
    doc.text(`Offer discount: -INR ${money(bill.offer_discount_amount ?? booking.offer_discount_amount ?? booking.discount_amount ?? 0)}`);
    doc.text(`Amount after offer: INR ${money(bill.amount_after_offer ?? booking.amount_after_offer ?? bill.subtotal)}`);
    if (bill.applied_coupon_code || booking.applied_coupon_code) {
      doc.text(`Coupon (${bill.applied_coupon_code || booking.applied_coupon_code}): -INR ${money(bill.coupon_discount_amount ?? booking.coupon_discount_amount ?? 0)}`);
    }
    doc.text(`Discounted room charges: INR ${money(bill.subtotal)}`);
    doc.text(`Extra charges: INR ${money(bill.extra_charges)}`);
    doc.text(`GST (${bill.gst_percent}%): INR ${money(bill.gst_amount)}`);

    if (extensions.length) {
      doc.moveDown(0.75);
      doc.fontSize(13).text("Extension settlement", { underline: true });
      doc.fontSize(11).text(`Original stay amount: INR ${money(bill.original_stay_amount)}`);
      doc.text(`Original paid amount: INR ${money(bill.original_paid_amount)}`);
      for (const extension of extensions) {
        doc.moveDown(0.35);
        doc.text(
          `Extension: ${extension.originalCheckoutDate || extension.original_checkout_date || extension.requested_from}`
          + ` to ${extension.extendedCheckoutDate || extension.extended_checkout_date || extension.requested_to}`
          + ` (${Number(extension.extensionNights || extension.extension_nights || extension.nights || 0)} nights)`
        );
        doc.text(`Extension amount: INR ${money(extension.extensionPayableAmount ?? extension.extension_payable_amount ?? extension.extra_amount)}`);
        doc.text(`Extension payment: ${extension.extensionPaymentStatus || extension.payment_status || "pending"}`);
        doc.text(`Payment mode: ${extension.payment_method || "-"}`);
        if (extension.payment_reference) doc.text(`Transaction reference: ${extension.payment_reference}`);
        if (extension.payment_confirmed_at) {
          doc.text(`Payment confirmed: ${formatISTDateTimeForReport(extension.payment_confirmed_at)}`);
        }
      }
    }

    doc.moveDown(0.5);
    doc.text(`Grand Total: INR ${money(bill.total_amount)}`);
    doc.text(`Total Paid: INR ${money(bill.total_paid_amount ?? booking.amount_paid)}`);
    doc.text(`Remaining: INR ${money(bill.remaining_amount ?? booking.remaining_amount)}`);
    doc.text(`Payment: ${bill.payment_method || "-"} / ${bill.payment_status || "-"}`);

    doc.moveDown(1.5);
    doc.fontSize(11).text("Thank you for staying with us - Panchavati Grand, Nashik", {
      align: "center",
    });

    doc.end();
  });
}

module.exports = {
  createBillPdfBuffer,
};

