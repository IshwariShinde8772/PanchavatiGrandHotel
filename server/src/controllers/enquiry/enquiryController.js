const { Op } = require("sequelize");
const { Enquiry, Notification } = require("../../../models");
const { sendEmail } = require("../../services/emailService");
const { getPagination } = require("../../utils/pagination");

async function createEnquiry(req, res) {
  const enquiry = await Enquiry.create({
    ...req.body,
    source: req.body.source || "online",
  });

  // Send notification to admin and receptionist about new enquiry
  await Notification.create({
    target_role: "reception",
    target_id: null,
    title: "New Enquiry Received",
    message: `New enquiry from ${enquiry.full_name} (${enquiry.phone || enquiry.email || "No contact info"})`,
    type: "enquiry",
    is_read: false,
  });

  await Notification.create({
    target_role: "receptionist",
    target_id: null,
    title: "New Enquiry Received",
    message: `New enquiry from ${enquiry.full_name} (${enquiry.phone || enquiry.email || "No contact info"})`,
    type: "enquiry",
    is_read: false,
  });

  return res.status(201).json({
    success: true,
    data: enquiry,
    message: "Enquiry received successfully",
  });
}

async function createOfflineEnquiry(req, res) {
  const payload = {
    full_name: req.body.full_name,
    phone: req.body.phone,
    email: req.body.email || null,
    enquiry_type: req.body.enquiry_type || "general",
    check_in: req.body.check_in || null,
    check_out: req.body.check_out || null,
    adults: req.body.adults || null,
    room_category: req.body.room_category || null,
    message: req.body.message,
    source: req.body.source || "offline",
    status: req.body.status || "new",
    created_by_staff_id: req.user.id,
  };

  const enquiry = await Enquiry.create(payload);

  await Notification.create({
    target_role: "admin",
    target_id: null,
    title: "Offline Enquiry Added",
    message: `${enquiry.full_name} was added by reception (${enquiry.source}).`,
    type: "enquiry",
    is_read: false,
  });

  return res.status(201).json({
    success: true,
    data: enquiry,
    message: "Offline enquiry added successfully",
  });
}

async function listEnquiries(req, res) {
  const { page, limit, offset } = getPagination(req.query);
  const where = {};
  if (req.query.q) {
    const query = `%${req.query.q}%`;
    where[Op.or] = [
      { full_name: { [Op.like]: query } },
      { phone: { [Op.like]: query } },
      { email: { [Op.like]: query } },
      { message: { [Op.like]: query } },
    ];
  }
  const { count, rows } = await Enquiry.findAndCountAll({
    where,
    order: [["created_at", "DESC"]],
    offset,
    limit,
  });

  return res.json({
    success: true,
    data: rows,
    total: count,
    page,
    limit,
    totalRecords: count,
    totalPages: Math.max(Math.ceil(count / limit), 1),
    currentPage: page,
    pageSize: limit,
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

  // Send notification to customer about enquiry response
  // Note: Since enquiries can be created by non-registered customers, we use target_role: "all"
  // to ensure the notification is visible if the customer later registers
  await Notification.create({
    target_role: "all",
    target_id: null,
    title: "Response to Your Enquiry",
    message: `Your enquiry has been responded to. ${req.body.response_text ? "Check your email for details." : ""}`,
    type: "enquiry",
    is_read: false,
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
  createOfflineEnquiry,
  listEnquiries,
  respondToEnquiry,
  deleteEnquiry,
};

