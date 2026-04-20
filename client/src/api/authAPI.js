import axiosInstance from "./axiosInstance";

export const authAPI = {
  sendOtp: (payload) => axiosInstance.post("/auth/send-otp", payload).then((res) => res.data),
  verifyOtp: (payload) => axiosInstance.post("/auth/verify-otp", payload).then((res) => res.data),
  login: (payload) => axiosInstance.post("/auth/login", payload).then((res) => res.data),
  loginCustomer: (payload) => axiosInstance.post("/auth/customer/login", payload).then((res) => res.data),
  registerCustomer: (payload) => axiosInstance.post("/auth/customer/register", payload).then((res) => res.data),
  loginAdmin: (payload) => axiosInstance.post("/auth/admin/login", payload).then((res) => res.data),
  loginStaff: (payload) => axiosInstance.post("/auth/staff/login", payload).then((res) => res.data),
  me: () => axiosInstance.get("/customer/me").then((res) => res.data),
  updateProfile: (payload) => axiosInstance.put("/customer/profile", payload).then((res) => res.data),
  getNotifications: () => axiosInstance.get("/customer/notifications").then((res) => res.data),
  markNotificationsRead: () => axiosInstance.patch("/customer/notifications/read-all").then((res) => res.data),
  deleteNotification: (id) => axiosInstance.delete(`/customer/notifications/${id}`).then((res) => res.data),
  clearNotifications: () => axiosInstance.delete(`/customer/notifications`).then((res) => res.data),
};
