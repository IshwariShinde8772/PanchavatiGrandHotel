const sequelize = require("../src/config/db");
const AdminFactory = require("./Admin");
const BillFactory = require("./Bill");
const BookingFactory = require("./Booking");
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
const SavedRoomFactory = require("./SavedRoom");
const StaffFactory = require("./Staff");
const TaskFactory = require("./Task");
const BookingExtensionRequestFactory = require("./BookingExtensionRequest");

const SeasonalPriceFactory = require("./SeasonalPrice");
const OfferFactory = require("./Offer");

const Admin = AdminFactory(sequelize);
const Bill = BillFactory(sequelize);
const Booking = BookingFactory(sequelize);
const BookingExtensionRequest = BookingExtensionRequestFactory(sequelize);
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
const SavedRoom = SavedRoomFactory(sequelize);
const Staff = StaffFactory(sequelize);
const Task = TaskFactory(sequelize);
const SeasonalPrice = SeasonalPriceFactory(sequelize);
const Offer = OfferFactory(sequelize);

Customer.hasMany(Booking, { foreignKey: "customer_id", as: "bookings" });
Customer.hasMany(Feedback, { foreignKey: "customer_id", as: "feedbacks" });
Customer.hasMany(SavedRoom, { foreignKey: "customer_id", as: "savedRooms" });
Customer.hasMany(PaymentTransaction, { foreignKey: "customer_id", as: "transactions" });
Customer.hasMany(BookingExtensionRequest, { foreignKey: "customer_id", as: "extensionRequests" });

Room.hasMany(Booking, { foreignKey: "room_id", as: "bookings" });
Room.hasMany(MaintenanceLog, { foreignKey: "room_id", as: "maintenanceLogs" });
Room.hasMany(SavedRoom, { foreignKey: "room_id", as: "savedByCustomers" });
Room.hasMany(Task, { foreignKey: "room_id", as: "tasks" });

Booking.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
Booking.belongsTo(Room, { foreignKey: "room_id", as: "room" });
Booking.hasOne(Bill, { foreignKey: "booking_id", as: "bill" });
Booking.hasOne(CustomerHistory, { foreignKey: "booking_id", as: "history" });
Booking.hasMany(PaymentTransaction, { foreignKey: "booking_id", as: "transactions" });
Booking.hasMany(BookingExtensionRequest, { foreignKey: "booking_id", as: "extensionRequests" });

Bill.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
CustomerHistory.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
PaymentTransaction.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
PaymentTransaction.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
BookingExtensionRequest.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });
BookingExtensionRequest.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });

Staff.hasMany(Task, { foreignKey: "staff_id", as: "tasks" });
Staff.hasMany(MaintenanceLog, { foreignKey: "reported_by_staff_id", as: "reportedMaintenance" });
Staff.hasMany(MaintenanceLog, { foreignKey: "assigned_to_staff_id", as: "assignedMaintenance" });

Task.belongsTo(Staff, { foreignKey: "staff_id", as: "staff" });
Task.belongsTo(Room, { foreignKey: "room_id", as: "room" });
MaintenanceLog.belongsTo(Room, { foreignKey: "room_id", as: "room" });
MaintenanceLog.belongsTo(Staff, { foreignKey: "reported_by_staff_id", as: "reporter" });
MaintenanceLog.belongsTo(Staff, { foreignKey: "assigned_to_staff_id", as: "assignee" });
SavedRoom.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
SavedRoom.belongsTo(Room, { foreignKey: "room_id", as: "room" });
Feedback.belongsTo(Customer, { foreignKey: "customer_id", as: "customer" });
Feedback.belongsTo(Booking, { foreignKey: "booking_id", as: "booking" });

module.exports = {
  sequelize,
  Admin,
  Bill,
  Booking,
  BookingExtensionRequest,
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
  SavedRoom,
  Staff,
  Task,
  SeasonalPrice,
  Offer,
};
