import axiosInstance from "./axiosInstance";

export const adminAPI = {
  // Customers
  listCustomers: () => axiosInstance.get("/admin/customers").then((res) => res.data),
  getCustomerDetail: (id) => axiosInstance.get(`/admin/customers/${id}`).then((res) => res.data),
  toggleCustomerDelete: (id) => axiosInstance.patch(`/admin/customers/${id}/toggle-delete`).then((res) => res.data),

  // Bookings
  allBookings: (params) => axiosInstance.get("/admin/bookings", { params }).then((res) => res.data),
  updateBooking: (id, payload) => axiosInstance.put(`/admin/bookings/${id}`, payload).then((res) => res.data),
  deleteBooking: (id) => axiosInstance.delete(`/admin/bookings/${id}`).then((res) => res.data),

  // Enquiries
  listEnquiries: () => axiosInstance.get("/admin/enquiries").then((res) => res.data),
  respondToEnquiry: (id, payload) => axiosInstance.patch(`/admin/enquiries/${id}/respond`, payload).then((res) => res.data),
  deleteEnquiry: (id) => axiosInstance.delete(`/admin/enquiries/${id}`).then((res) => res.data),

  // Feedback
  listFeedback: () => axiosInstance.get("/admin/feedbacks").then((res) => res.data),
  moderateFeedback: (id, payload) => axiosInstance.patch(`/admin/feedbacks/${id}`, payload).then((res) => res.data),
  deleteFeedback: (id) => axiosInstance.delete(`/admin/feedbacks/${id}`).then((res) => res.data),

  // Rooms
  listRooms: (params) => axiosInstance.get("/admin/rooms", { params }).then((res) => res.data),
  createRoom: (payload) => axiosInstance.post("/admin/rooms", payload).then((res) => res.data),
  updateRoom: (id, payload) => axiosInstance.put(`/admin/rooms/${id}`, payload).then((res) => res.data),
  deleteRoom: (id) => axiosInstance.delete(`/admin/rooms/${id}`).then((res) => res.data),

  // Staff
  listStaff: (params) => axiosInstance.get("/admin/staff", { params }).then((res) => res.data),
  createStaff: (payload) => axiosInstance.post("/admin/staff", payload).then((res) => res.data),
  updateStaff: (id, payload) => axiosInstance.put(`/admin/staff/${id}`, payload).then((res) => res.data),
  deleteStaff: (id) => axiosInstance.delete(`/admin/staff/${id}`).then((res) => res.data),

  // Dashboard
  dashboardStats: () => axiosInstance.get("/admin/dashboard").then((res) => res.data),

  // Notifications
  sendNotification: (payload) => axiosInstance.post("/admin/notifications", payload).then((res) => res.data),
  listNotifications: (params) => axiosInstance.get("/admin/notifications", { params }).then((res) => res.data),
  markNotificationRead: (id) => axiosInstance.patch(`/admin/notifications/${id}/read`).then((res) => res.data),
  deleteNotification: (id) => axiosInstance.delete(`/admin/notifications/${id}`).then((res) => res.data),
};
