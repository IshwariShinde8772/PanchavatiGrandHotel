const { Enquiry } = require("../../../models");
const { sendEmail } = require("../../services/emailService");

async function createEnquiry(req, res) {
  const enquiry = await Enquiry.create(req.body);
  return res.status(201).json({
    success: true,
    data: enquiry,
    message: "Enquiry received successfully",
  });
}

async function listEnquiries(req, res) {
  const enquiries = await Enquiry.findAll({
    order: [["created_at", "DESC"]],
  });

  return res.json({
    success: true,
    data: enquiries,
    total: enquiries.length,
    page: 1,
    limit: enquiries.length || 10,
  });
}

async function respondToEnquiry(req, res) {
  const enquiry = await Enquiry.findByPk(req.params.id);
  if (!enquiry) {
    return res.status(404).json({ success: false, error: "Enquiry not found" });
  }

  await enquiry.update({
    is_responded: true,
    response_text: req.body.response_text,
    responded_by_staff_id: req.user.id,
  });

  if (enquiry.email) {
    await sendEmail({
      to: enquiry.email,
      subject: "Response from Panchavati Grand",
      html: `<p>${req.body.response_text}</p>`,
      text: req.body.response_text,
    });
  }

  return res.json({
    success: true,
    data: enquiry,
    message: "Enquiry responded successfully",
  });
}

async function deleteEnquiry(req, res) {
  const enquiry = await Enquiry.findByPk(req.params.id);
  if (!enquiry) {
    return res.status(404).json({ success: false, error: "Enquiry not found" });
  }
  await enquiry.destroy();
  return res.json({ success: true, message: "Enquiry deleted" });
}

module.exports = {
  createEnquiry,
  listEnquiries,
  respondToEnquiry,
  deleteEnquiry,
};

