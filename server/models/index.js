const sequelize = require("../src/config/db");
const AmenityFactory = require("./Amenity");
const AdminFactory = require("./Admin");
const BillFactory = require("./Bill");
const BookingFactory = require("./Booking");
const CouponFactory = require("./Coupon");
const CouponUsageFactory = require("./CouponUsage");
const CustomerFactory = require("./Customer");
const CustomerHistoryFactory = require("./CustomerHistory");
const EnquiryFactory = require("./Enquiry");
const FeedbackFactory = require("./Feedback");
const HotelSettingFactory = require("./HotelSetting");
const InventoryFactory = require("./Inventory");
const MaintenanceLogFactory = require("./MaintenanceLog");
const NotificationFactory = require("./Notification");
const PaymentTransactionFactory = require("./PaymentTransaction");
const RoomFactory = require("./Room");
const RoomAmenityFactory = require("./RoomAmenity");
const SavedRoomFactory = require("./SavedRoom");
const StaffFactory = require("./Staff");
const TaskFactory = require("./Task");
const BookingExtensionRequestFactory = require("./BookingExtensionRequest");
const RefundRequestFactory = require("./RefundRequest");
const AuditLogFactory = require("./AuditLog");

const OfferFactory = require("./Offer");

const Amenity = AmenityFactory(sequelize);
const Admin = AdminFactory(sequelize);
const Bill = BillFactory(sequelize);
const Booking = BookingFactory(sequelize);
const BookingExtensionRequest = BookingExtensionRequestFactory(sequelize);
const Coupon = CouponFactory(sequelize);
const CouponUsage = CouponUsageFactory(sequelize);
const Customer = CustomerFactory(sequelize);
const CustomerHistory = CustomerHistoryFactory(sequelize);
const Enquiry = EnquiryFactory(sequelize);
const Feedback = FeedbackFactory(sequelize);
const HotelSetting = HotelSettingFactory(sequelize);
const Inventory = InventoryFactory(sequelize);
const MaintenanceLog = MaintenanceLogFactory(sequelize);
const Notification = NotificationFactory(sequelize);
const PaymentTransaction = PaymentTransactionFactory(sequelize);
const Room = RoomFactory(sequelize);
const RoomAmenity = RoomAmenityFactory(sequelize);
const SavedRoom = SavedRoomFactory(sequelize);
const Staff = StaffFactory(sequelize);
const Task = TaskFactory(sequelize);
const Offer = OfferFactory(sequelize);
const RefundRequest = RefundRequestFactory(sequelize);
const AuditLog = AuditLogFactory(sequelize);

Customer.hasMany(Booking, { foreignKey: "customer_id", as: "bookings" });
Customer.hasMany(CouponUsage, { foreignKey: "customer_id", as: "couponUsages" });
Customer.hasMany(Feedback, { foreignKey: "customer_id", as: "feedbacks" });
Customer.hasMany(SavedRoom, { foreignKey: "customer_id", as: "savedRooms" });
Customer.hasMany(PaymentTransaction, { foreignKey: "customer_id", as: "transactions" });
Customer.hasMany(BookingExtensionRequest, { foreignKey: "customer_id", as: "extensionRequests" });
Customer.hasMany(RefundRequest, { foreignKey: "customer_id", as: "refundRequests" });

Room.hasMany(Booking, { foreignKey: "room_id", as: "bookings" });
Room.hasMany(MaintenanceLog, { foreignKey: "room_id", as: "maintenanceLogs" });
Room.hasMany(SavedRoom, { foreignKey: "room_id", as: "savedByCustomers" });
Room.hasMany(Task, { foreignKey: "room_id", as: "tasks" });
Room.belongsToMany(Amenity, {
  through: RoomAmenity,
  foreignKey: "room_id",
  otherKey: "amenity_id",
  as: "amenityRecords",
});
Amenity.belongsToMany(Room, {
  through: RoomAmenity,
  foreignKey: "amenity_id",
  otherKey: "room_id",
  as: "rooms",
});
RoomAmenity.belongsTo(Room, { foreignKey: "room_id", as: "room" });
RoomAmenity.belongsTo(Amenity, { foreignKey: "amenity_id", as: "amenity" });

Booking.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
Booking.belongsTo(Room, { foreignKey: "room_id", as: "room" });
Booking.belongsTo(Coupon, { foreignKey: "coupon_id", as: "coupon" });
Booking.hasOne(CouponUsage, { foreignKey: "booking_id", as: "couponUsage" });
Booking.hasOne(Bill, { foreignKey: "booking_id", as: "bill" });
Booking.hasOne(CustomerHistory, { foreignKey: "booking_id", as: "history" });
Booking.hasMany(PaymentTransaction, { foreignKey: "booking_id", as: "transactions" });
Booking.hasMany(BookingExtensionRequest, { foreignKey: "booking_id", as: "extensionRequests" });
Booking.hasOne(RefundRequest, { foreignKey: "booking_id", as: "refundRequest" });
Booking.hasOne(Feedback, { foreignKey: "booking_id", as: "feedback" });

Bill.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
CustomerHistory.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
PaymentTransaction.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
PaymentTransaction.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
BookingExtensionRequest.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
BookingExtensionRequest.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
BookingExtensionRequest.hasMany(PaymentTransaction, { foreignKey: "extension_request_id", as: "paymentTransactions" });
PaymentTransaction.belongsTo(BookingExtensionRequest, { foreignKey: "extension_request_id", as: "extensionRequest" });
Coupon.belongsTo(Admin, { foreignKey: "created_by_admin_id", as: "createdByAdmin" });
Coupon.hasMany(CouponUsage, { foreignKey: "coupon_id", as: "usages" });
CouponUsage.belongsTo(Coupon, { foreignKey: "coupon_id", as: "coupon" });
CouponUsage.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
CouponUsage.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
Admin.hasMany(Coupon, { foreignKey: "created_by_admin_id", as: "coupons" });
RefundRequest.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
RefundRequest.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
RefundRequest.belongsTo(Staff, { foreignKey: "approved_by_staff_id", as: "approvedBy" });
RefundRequest.belongsTo(Admin, { foreignKey: "processed_by_admin_id", as: "processedByAdmin" });
Admin.hasMany(RefundRequest, { foreignKey: "processed_by_admin_id", as: "processedRefunds" });

Staff.hasMany(Task, { foreignKey: "staff_id", as: "tasks" });
Staff.hasMany(MaintenanceLog, { foreignKey: "reported_by_staff_id", as: "reportedMaintenance" });
Staff.hasMany(MaintenanceLog, { foreignKey: "assigned_to_staff_id", as: "assignedMaintenance" });
Staff.hasMany(Feedback, { foreignKey: "collected_by_receptionist_id", as: "collectedFeedback" });

Task.belongsTo(Staff, { foreignKey: "staff_id", as: "staff" });
Task.belongsTo(Room, { foreignKey: "room_id", as: "room" });
MaintenanceLog.belongsTo(Room, { foreignKey: "room_id", as: "room" });
MaintenanceLog.belongsTo(Staff, { foreignKey: "reported_by_staff_id", as: "reporter" });
MaintenanceLog.belongsTo(Staff, { foreignKey: "assigned_to_staff_id", as: "assignee" });
SavedRoom.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
SavedRoom.belongsTo(Room, { foreignKey: "room_id", as: "room" });
Feedback.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
Feedback.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
Feedback.belongsTo(Room, { foreignKey: "room_id", as: "room" });
Feedback.belongsTo(Staff, { foreignKey: "collected_by_receptionist_id", as: "collectedByReceptionist" });

module.exports = {
  sequelize,
  Amenity,
  Admin,
  Bill,
  Booking,
  BookingExtensionRequest,
  Coupon,
  CouponUsage,
  Customer,
  CustomerHistory,
  Enquiry,
  Feedback,
  HotelSetting,
  Inventory,
  MaintenanceLog,
  Notification,
  PaymentTransaction,
  Room,
  RoomAmenity,
  SavedRoom,
  Staff,
  Task,
  Offer,
  RefundRequest,
  AuditLog,
};
