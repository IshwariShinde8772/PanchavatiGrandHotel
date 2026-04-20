const PDFDocument = require("pdfkit");

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

    doc.moveDown(1);
    doc.text(`Fare per night: INR ${bill.fare_per_night}`);
    doc.text(`Subtotal: INR ${bill.subtotal}`);
    doc.text(`Extra charges: INR ${bill.extra_charges}`);
    doc.text(`GST (${bill.gst_percent}%): INR ${bill.gst_amount}`);
    doc.text(`Grand Total: INR ${bill.total_amount}`);
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

