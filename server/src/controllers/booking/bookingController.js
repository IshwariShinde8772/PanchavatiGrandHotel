const { Op } = require("sequelize");
const {
  sequelize,
  Booking,
  Customer,
  CustomerHistory,
  HotelSetting,
  Notification,
  PaymentTransaction,
  Room,
  Task,
  Bill,
} = require("../../../models");
const { calculateGST } = require("../../utils/gst");
const { diffNights, parseDateInput, startOfTodayUTC } = require("../../utils/dateHelpers");
const { calculateEffectivePrice, countOverlappingBookings } = require("../../services/roomService");
const { createOrder, verifySignature, refundPayment } = require("../../services/paymentService");
const { bookingRefFromId } = require("../../utils/billNumber");
const { generateBill } = require("../../services/billService");
const { sendBookingConfirmation } = require("../../services/emailService");
const { createQrTransaction, serializeTransaction } = require("../../services/transactionService");
const { getPagination } = require("../../utils/pagination");
const env = require("../../config/env");

function ensureBookingDates(checkIn, checkOut) {
  const inDate = parseDateInput(checkIn);
  const outDate = parseDateInput(checkOut);
  const today = startOfTodayUTC();
  const nights = diffNights(checkIn, checkOut);

  if (!inDate || !outDate) {
    const error = new Error("Invalid check-in or check-out date");
    error.status = 400;
    throw error;
  }

  if (nights < 1 || nights > 30) {
    const error = new Error("Stay must be between 1 and 30 nights");
    error.status = 400;
    throw error;
  }

  if (inDate < today) {
    const error = new Error("Check-in cannot be in the past");
    error.status = 400;
    throw error;
  }

  return { nights };
}

async function prepareBookingData({ roomId, checkIn, checkOut, guests, transaction }) {
  const room = await Room.findByPk(roomId, { transaction });
  if (!room || !room.is_active) {
    const error = new Error("Room not found");
    error.status = 404;
    throw error;
  }

  const { nights } = ensureBookingDates(checkIn, checkOut);
  const overlapCount = await countOverlappingBookings({
    roomId,
    checkIn,
    checkOut,
    transaction,
  });

  if (overlapCount >= Number(room.total_units)) {
    const error = new Error("Room is not available for the selected dates");
    error.status = 409;
    throw error;
  }

  if (guests > Number(room.capacity)) {
    const error = new Error("Guest count exceeds room capacity");
    error.status = 400;
    throw error;
  }

  const settings = await HotelSetting.findByPk(1, { transaction });
  const price = calculateEffectivePrice(room, checkIn);
  const fare = Number((price.pricePerNight * nights).toFixed(2));
  const gst = calculateGST(fare, settings?.gst_percent || 12);

  return {
    room,
    settings,
    nights,
    price,
    fare,
    gst,
  };
}

async function createBooking(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const { room_id, check_in, check_out, guests, special_requests, payment_method, guest } = req.body;
    const customer = await Customer.findByPk(req.user.id, { transaction });

    await customer.update({
      full_name: guest.full_name || customer.full_name,
      email: guest.email || customer.email,
      phone: guest.phone || customer.phone,
      nationality: guest.nationality || customer.nationality,
      id_type: guest.id_type || customer.id_type,
      id_number: guest.id_number || customer.id_number,
      id_expiry: guest.id_expiry || customer.id_expiry,
      id_doc_url: guest.id_doc_url || customer.id_doc_url,
    }, { transaction });

    const prepared = await prepareBookingData({
      roomId: room_id,
      checkIn: check_in,
      checkOut: check_out,
      guests,
      transaction,
    });

    const isPayLater = payment_method === "pay_later";
    const isQrPayment = payment_method === "qr";
    const order = !isPayLater && !isQrPayment
      ? await createOrder({
          amount: Math.round(prepared.gst.totalAmount * 100),
          currency: "INR",
          receipt: `room_${room_id}_${Date.now()}`,
        })
      : null;

    const booking = await Booking.create({
      customer_id: customer.id,
      room_id,
      check_in,
      check_out,
      nights: prepared.nights,
      guests,
      fare_per_night: prepared.price.pricePerNight,
      total_fare: prepared.fare,
      gst_percent: prepared.gst.gstPercent,
      gst_amount: prepared.gst.gstAmount,
      total_amount: prepared.gst.totalAmount,
      special_requests,
      payment_method,
      razorpay_order_id: order?.id || null,
      payment_status: isPayLater ? "pay_at_hotel" : "pending",
      status: isPayLater ? "confirmed" : "pending",
      booked_by: "customer",
    }, { transaction });

    await booking.update({
      booking_ref: bookingRefFromId(booking.id, new Date()),
    }, { transaction });

    let paymentTransaction = null;

    if (isQrPayment) {
      paymentTransaction = await createQrTransaction({
        PaymentTransaction,
        booking,
        customer,
        hotelSettings: prepared.settings,
        transaction,
      });
    }

    if (isPayLater) {
      await Notification.create({
        target_role: "customer",
        target_id: customer.id,
        title: "Booking Reserved",
        message: `Your room is reserved. Payment is due at check-in for ${booking.booking_ref}.`,
        type: "booking",
      }, { transaction });

      await sendBookingConfirmation(booking, customer, prepared.settings);
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: {
        booking,
        transaction: paymentTransaction ? serializeTransaction(paymentTransaction) : null,
        razorpayOrderId: order?.id || null,
        key: process.env.RAZORPAY_KEY_ID || "",
        amount: order?.amount || null,
        currency: order?.currency || "INR",
      },
      message: isPayLater
        ? "Booking reserved successfully"
        : isQrPayment
          ? "QR payment generated successfully"
          : "Booking created successfully",
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function verifyBookingPayment(req, res) {
  const { booking_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!env.razorpay.keyId || !env.razorpay.keySecret) {
    return res.status(503).json({
      success: false,
      error: "Payment verification is temporarily unavailable",
      message: "Razorpay verification is not configured on the server",
    });
  }

  const booking = await Booking.findByPk(booking_id, {
    include: [
      { model: Customer, as: "customer" },
      { model: Room, as: "room" },
    ],
  });

  if (!booking) {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }

  const alreadyVerified = booking.payment_status === "paid" && booking.status === "confirmed";

  if (alreadyVerified && booking.razorpay_payment_id && booking.razorpay_payment_id !== razorpay_payment_id) {
    return res.status(409).json({
      success: false,
      error: "Booking is already verified with a different payment reference",
    });
  }

  const valid = verifySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });

  if (!valid) {
    return res.status(400).json({ success: false, error: "Payment verification failed" });
  }

  if (!alreadyVerified) {
    await booking.update({
      status: "confirmed",
      payment_status: "paid",
      payment_method: "online",
      razorpay_payment_id,
    });
  }

  const [paymentRecord] = await PaymentTransaction.findOrCreate({
    where: {
      booking_id: booking.id,
      payment_reference: razorpay_payment_id,
    },
    defaults: {
      booking_id: booking.id,
      customer_id: booking.customer_id,
      amount: booking.total_amount,
      currency: "INR",
      payment_method: "online",
      status: "paid",
      payment_reference: razorpay_payment_id,
      paid_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  if (paymentRecord.status !== "paid") {
    await paymentRecord.update({
      status: "paid",
      paid_at: new Date(),
      updated_at: new Date(),
    });
  }

  if (!alreadyVerified) {
    const notificationsToEnsure = [
      {
        target_role: "admin",
        target_id: null,
        title: "New Paid Booking",
        message: `${booking.booking_ref} has been paid online.`,
        type: "payment",
      },
      {
        target_role: "receptionist",
        target_id: null,
        title: "New Confirmed Booking",
        message: `${booking.booking_ref} is ready for arrival.`,
        type: "booking",
      },
      {
        target_role: "customer",
        target_id: booking.customer_id,
        title: "Booking Confirmed",
        message: `Your booking ${booking.booking_ref} is confirmed.`,
        type: "booking",
      },
    ];

    for (const item of notificationsToEnsure) {
      const where = {
        target_role: item.target_role,
        title: item.title,
        message: item.message,
        type: item.type,
      };

      if (item.target_id) {
        where.target_id = item.target_id;
      }

      const existing = await Notification.findOne({ where });
      if (!existing) {
        await Notification.create(item);
      }
    }

    const settings = await HotelSetting.findByPk(1);
    await sendBookingConfirmation(booking, booking.customer, settings);
  }

  return res.json({
    success: true,
    data: {
      booking,
      bookingRef: booking.booking_ref,
    },
    message: alreadyVerified ? "Payment already verified" : "Payment verified successfully",
  });
}

async function listCustomerBookings(req, res) {
  const bookings = await Booking.findAll({
    where: { customer_id: req.user.id },
    include: [
      { model: Room, as: "room" },
      { model: Bill, as: "bill", required: false },
      { association: "history", required: false },
      { model: PaymentTransaction, as: "transactions", required: false },
    ],
    order: [["created_at", "DESC"]],
  });

  return res.json({
    success: true,
    data: bookings,
    total: bookings.length,
    page: 1,
    limit: bookings.length || 10,
  });
}

async function getCustomerBooking(req, res) {
  const booking = await Booking.findOne({
    where: { id: req.params.id, customer_id: req.user.id },
    include: [
      { model: Room, as: "room" },
      { model: Bill, as: "bill", required: false },
      { association: "history", required: false },
      { model: PaymentTransaction, as: "transactions", required: false },
    ],
  });

  if (!booking) {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }

  return res.json({ success: true, data: booking });
}

async function cancelBooking(req, res) {
  const booking = await Booking.findByPk(req.params.id, {
    include: [
      { model: Customer, as: "customer" },
      { model: Room, as: "room" },
    ],
  });

  if (!booking) {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }

  if (req.user.role === "customer" && booking.customer_id !== req.user.id) {
    return res.status(403).json({ success: false, error: "You cannot cancel this booking" });
  }

  if (booking.status === "checked_in" || booking.status === "checked_out") {
    return res.status(400).json({ success: false, error: "This booking can no longer be cancelled" });
  }

  const checkInDate = new Date(booking.check_in);
  const hoursBeforeCheckIn = (checkInDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const penalty = hoursBeforeCheckIn > 48 ? 0 : Number(booking.fare_per_night);

  const previousPaymentStatus = booking.payment_status;
  await booking.update({
    status: "cancelled",
    cancelled_at: new Date(),
    cancellation_reason: req.body.reason,
    payment_status: previousPaymentStatus === "paid" ? "refunded" : previousPaymentStatus,
  });

  if (previousPaymentStatus === "paid" && booking.razorpay_payment_id) {
    await refundPayment(booking.razorpay_payment_id, Math.max((Number(booking.total_amount) - penalty) * 100, 0));
  }

  await PaymentTransaction.update(
    {
      status: "cancelled",
      updated_at: new Date(),
      remarks: req.body.reason || "Booking cancelled",
    },
    {
      where: {
        booking_id: booking.id,
        status: "pending",
      },
    }
  );

  await Notification.create({
    target_role: "customer",
    target_id: booking.customer_id,
    title: "Booking Cancelled",
    message: `${booking.booking_ref} has been cancelled. Refund will follow policy terms.`,
    type: "booking",
  });

  return res.json({
    success: true,
    data: {
      booking,
      penalty,
      refund: Math.max(Number(booking.total_amount) - penalty, 0),
    },
    message: "Booking cancelled successfully",
  });
}

async function listAllBookings(req, res) {
  const { page, limit, offset } = getPagination(req.query);
  const where = {};
  const roomWhere = {};
  const parseList = (value) =>
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  if (req.query.status) {
    const statuses = parseList(req.query.status);
    where.status = statuses.length > 1 ? { [Op.in]: statuses } : statuses[0];
  }

  if (req.query.payment_status) {
    const paymentStatuses = parseList(req.query.payment_status);
    where.payment_status = paymentStatuses.length > 1 ? { [Op.in]: paymentStatuses } : paymentStatuses[0];
  }

  if (req.query.booked_by) {
    const bookedByValues = parseList(req.query.booked_by);
    where.booked_by = bookedByValues.length > 1 ? { [Op.in]: bookedByValues } : bookedByValues[0];
  }

  if (req.query.q) {
    const query = `%${req.query.q}%`;
    where[Op.or] = [
      { booking_ref: { [Op.like]: query } },
      { "$customer.full_name$": { [Op.like]: query } },
      { "$customer.phone$": { [Op.like]: query } },
      { "$room.room_number$": { [Op.like]: query } },
    ];
  }

  if (req.query.category) {
    roomWhere.category = req.query.category;
  }

  const { count, rows } = await Booking.findAndCountAll({
    where,
    include: [
      {
        model: Customer,
        as: "customer",
        required: false,
        attributes: { exclude: ["password_hash", "otp_code", "otp_expires_at"] },
      },
      {
        model: Room,
        as: "room",
        where: Object.keys(roomWhere).length ? roomWhere : undefined,
        required: Boolean(req.query.category),
      },
      { model: Bill, as: "bill", required: false },
    ],
    order: [["created_at", "DESC"]],
    offset,
    limit,
    distinct: true,
    subQuery: false,
  });

  return res.json({
    success: true,
    data: rows,
    total: count,
    page,
    limit,
  });
}

async function createWalkInBooking(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const { guest, room_id, check_in, check_out, guests, special_requests, payment_method } = req.body;
    const [customer] = await Customer.findOrCreate({
      where: { phone: guest.phone },
      defaults: {
        full_name: guest.full_name,
        phone: guest.phone,
        email: guest.email || null,
        nationality: guest.nationality,
        id_type: guest.id_type,
        id_number: guest.id_number,
        otp_verified: true,
      },
      transaction,
    });

    await customer.update({
      full_name: guest.full_name,
      email: guest.email || customer.email,
      nationality: guest.nationality || customer.nationality,
      id_type: guest.id_type || customer.id_type,
      id_number: guest.id_number || customer.id_number,
    }, { transaction });

    const prepared = await prepareBookingData({
      roomId: room_id,
      checkIn: check_in,
      checkOut: check_out,
      guests,
      transaction,
    });

    const booking = await Booking.create({
      customer_id: customer.id,
      room_id,
      check_in,
      check_out,
      nights: prepared.nights,
      guests,
      fare_per_night: prepared.price.pricePerNight,
      total_fare: prepared.fare,
      gst_percent: prepared.gst.gstPercent,
      gst_amount: prepared.gst.gstAmount,
      total_amount: prepared.gst.totalAmount,
      special_requests,
      payment_method,
      payment_status: "paid",
      status: "confirmed",
      booked_by: "receptionist",
    }, { transaction });

    await booking.update({
      booking_ref: bookingRefFromId(booking.id, new Date()),
    }, { transaction });

    const bill = await generateBill(booking.id, [], transaction);
    await transaction.commit();

    return res.status(201).json({
      success: true,
      data: { booking, bill },
      message: "Walk-in booking created successfully",
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function checkInBooking(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const booking = req.body.booking_ref
      ? await Booking.findOne({ where: { booking_ref: req.body.booking_ref }, transaction })
      : await Booking.findByPk(req.params.id, { transaction });

    if (!booking) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    const room = await Room.findByPk(booking.room_id, { transaction });
    await booking.update({
      status: "checked_in",
      actual_checkin_time: new Date(),
      id_verified: req.body.id_verified,
      payment_method: req.body.payment_method || booking.payment_method,
      payment_status: req.body.payment_status || booking.payment_status,
    }, { transaction });

    await room.update({ status: "occupied" }, { transaction });

    await Task.create({
      staff_id: req.user.id,
      room_id: room.id,
      title: `Prepare room ${room.room_number} for guest`,
      description: `Arrival support and final checks for ${booking.booking_ref}`,
      room_number: room.room_number,
      task_type: "service",
      priority: "normal",
    }, { transaction });

    await Notification.create({
      target_role: "customer",
      target_id: booking.customer_id,
      title: "Checked In",
      message: `Welcome to Panchavati Grand. Your check-in for ${booking.booking_ref} is complete.`,
      type: "booking",
    }, { transaction });

    await transaction.commit();

    return res.json({
      success: true,
      data: booking,
      message: "Check-in completed successfully",
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function checkOutBooking(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Customer, as: "customer" },
        { model: Room, as: "room" },
      ],
      transaction,
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    const extras = (req.body.extras || []).map((item) => ({
      ...item,
      title: item.title || item.label || "Extra Charge",
      amount: Number(item.amount || 0),
    }));
    const extraCharges = extras.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    await booking.update({
      status: "checked_out",
      actual_checkout_time: new Date(),
      extra_charges: Number(booking.extra_charges) + extraCharges,
      payment_method: req.body.payment_method || booking.payment_method,
      payment_status: req.body.payment_status || booking.payment_status,
    }, { transaction });

    await booking.room.update({ status: "cleaning" }, { transaction });

    await CustomerHistory.findOrCreate({
      where: { booking_id: booking.id },
      defaults: {
        booking_id: booking.id,
        customer_id: booking.customer_id,
        cust_name: booking.customer.full_name,
        phone: booking.customer.phone,
        room_number: booking.room.room_number,
        category: booking.room.category,
        check_in: booking.check_in,
        check_out: booking.check_out,
        nights: booking.nights,
        amount: booking.total_amount,
        status: booking.status,
      },
      transaction,
    });

    const bill = await generateBill(booking.id, extras, transaction);

    await Task.create({
      staff_id: req.user.id,
      room_id: booking.room.id,
      title: `Allocate cleaning for room ${booking.room.room_number}`,
      description: `Room ${booking.room.room_number} checked out under ${booking.booking_ref}. Assign cleaning and mark the room ready once housekeeping finishes.`,
      room_number: booking.room.room_number,
      task_type: "cleaning",
      priority: "high",
    }, { transaction });

    await Notification.create({
      target_role: "customer",
      target_id: booking.customer_id,
      title: "Thank You for Staying",
      message: "Thank you for staying with us. We'd love your feedback.",
      type: "system",
    }, { transaction });

    await Notification.create({
      target_role: "receptionist",
      title: "Cleaning Allocation Needed",
      message: `Room ${booking.room.room_number} is in cleaning after ${booking.booking_ref}. Assign housekeeping from the receptionist task queue.`,
      type: "booking",
    }, { transaction });

    await transaction.commit();

    return res.json({
      success: true,
      data: { booking, bill },
      message: "Check-out completed successfully",
    });
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function updateBooking(req, res) {
  const booking = await Booking.findByPk(req.params.id);
  if (!booking) {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }

  await booking.update(req.body);
  return res.json({
    success: true,
    data: booking,
    message: "Booking updated successfully",
  });
}

async function deleteBooking(req, res) {
  const booking = await Booking.findByPk(req.params.id);
  if (!booking) {
    return res.status(404).json({ success: false, error: "Booking not found" });
  }

  await booking.destroy();
  return res.json({
    success: true,
    message: "Booking deleted successfully",
  });
}

async function extendBooking(req, res) {
  const transaction = await sequelize.transaction();

  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        { model: Customer, as: "customer" },
        { model: Room, as: "room" },
      ],
      transaction,
    });

    if (!booking) {
      return res.status(404).json({ success: false, error: "Booking not found" });
    }

    if (!booking.room) {
      return res.status(400).json({ success: false, error: "Booking room information not available" });
    }

    // Check if booking can be extended
    if (!["confirmed", "checked_in"].includes(booking.status)) {
      return res.status(400).json({ success: false, error: `Cannot extend booking with status: ${booking.status}` });
    }

    if (!booking.fare_per_night || booking.gst_percent === null || booking.gst_percent === undefined) {
      return res.status(400).json({ success: false, error: "Booking pricing information is incomplete" });
    }

    if (!booking.check_in || !booking.check_out) {
      return res.status(400).json({ success: false, error: "Booking date information is incomplete" });
    }

    const { check_out, reason, payment_method } = req.body;
    console.log("Extend booking request:", { check_out, reason, payment_method, bookingId: req.params.id });
    
    const newCheckOut = parseDateInput(check_out);
    const currentCheckOut = parseDateInput(booking.check_out);

    console.log("Parsed dates:", { newCheckOut, currentCheckOut, bookingCheckOut: booking.check_out });

    if (!newCheckOut) {
      return res.status(400).json({ success: false, error: "Invalid check-out date" });
    }

    if (!currentCheckOut) {
      return res.status(400).json({ success: false, error: "Invalid current check-out date" });
    }

    if (!currentCheckOut) {
      return res.status(400).json({ success: false, error: "Invalid current check-out date" });
    }

    if (newCheckOut <= currentCheckOut) {
      return res.status(400).json({ success: false, error: "New check-out date must be after the current check-out date" });
    }

    // Check for room availability
    let overlapCount;
    try {
      const currentCheckOutDate = new Date(booking.check_out);
      const currentCheckOutStr = currentCheckOutDate.toISOString().split('T')[0];
      console.log("Checking availability:", { roomId: booking.room_id, checkIn: currentCheckOutStr, checkOut: check_out });
      overlapCount = await countOverlappingBookings({
        roomId: booking.room_id,
        checkIn: currentCheckOutStr,
        checkOut: check_out,
        excludeBookingId: booking.id,
        transaction,
      });
      console.log("Overlap count:", overlapCount);
    } catch (error) {
      console.error("Error checking room availability:", error);
      return res.status(500).json({ success: false, error: "Error checking room availability" });
    }

    if (overlapCount > 0) {
      return res.status(409).json({ success: false, error: "The room is not available for the requested extension period" });
    }

    // Calculate new totals
    const checkInDate = new Date(booking.check_in);
    const newCheckOutDate = new Date(check_out);
    const newNights = diffNights(checkInDate.toISOString().split('T')[0], check_out);
    const newFare = Number((booking.fare_per_night * newNights).toFixed(2));
    const gst = calculateGST(newFare, booking.gst_percent);
    const newTotalAmount = Number((newFare + gst.gstAmount).toFixed(2));
    const extraAmount = Number((newTotalAmount - booking.total_amount).toFixed(2));

    // Update booking
    await booking.update({
      check_out: new Date(check_out),
      nights: newNights,
      total_fare: newFare,
      gst_amount: gst.gstAmount,
      total_amount: newTotalAmount,
      payment_method: payment_method || booking.payment_method,
      payment_status: payment_method === "cash" ? "paid" : booking.payment_status,
    }, { transaction });

    // Create payment transaction if needed
    if (payment_method === "cash" && extraAmount > 0) {
      await PaymentTransaction.create({
        booking_id: booking.id,
        customer_id: booking.customer_id,
        amount: extraAmount,
        payment_method: "cash",
        status: "paid",
        remarks: `Extension payment for ${booking.booking_ref}: ${reason}`,
        paid_at: new Date(),
      }, { transaction });
    }

    // Create notification
    await Notification.create({
      target_role: "customer",
      target_id: booking.customer_id,
      title: "Booking extended",
      message: `Your booking ${booking.booking_ref} has been extended to ${check_out}. Additional charges: INR ${extraAmount}`,
      type: "booking",
    }, { transaction });

    await transaction.commit();

    return res.json({
      success: true,
      data: booking,
      message: "Booking extended successfully",
      extra_charges: extraAmount,
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Extend booking error:", error);
    console.error("Error stack:", error.stack);
    console.error("Error message:", error.message);
    return res.status(500).json({ success: false, error: error.message || "Failed to extend booking" });
  }
}

module.exports = {
  createBooking,
  verifyBookingPayment,
  listCustomerBookings,
  getCustomerBooking,
  cancelBooking,
  listAllBookings,
  createWalkInBooking,
  checkInBooking,
  checkOutBooking,
  extendBooking,
  updateBooking,
  deleteBooking,
};
