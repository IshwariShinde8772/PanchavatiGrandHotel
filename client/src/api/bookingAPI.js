import axiosInstance from "./axiosInstance";

export const bookingAPI = {
  create: (payload) => axiosInstance.post("/customer/bookings", payload).then((res) => res.data),
  verifyPayment: (payload) => axiosInstance.post("/customer/bookings/verify-payment", payload).then((res) => res.data),
  mine: () => axiosInstance.get("/customer/bookings").then((res) => res.data),
  detail: (id) => axiosInstance.get(`/customer/bookings/${id}`).then((res) => res.data),
  cancel: (id, payload) => axiosInstance.post(`/customer/bookings/${id}/cancel`, payload).then((res) => res.data),
  requestExtension: (id, payload) => axiosInstance.post(`/customer/bookings/${id}/extensions`, payload).then((res) => res.data),
  bookingExtensions: (id) => axiosInstance.get(`/customer/bookings/${id}/extensions`).then((res) => res.data),
  payExtension: (bookingId, requestId) => axiosInstance.post(`/customer/bookings/${bookingId}/extensions/${requestId}/pay`).then((res) => res.data),
  walkIn: (payload) => axiosInstance.post("/receptionist/walk-in-bookings", payload).then((res) => res.data),
  checkIn: (id, payload) => axiosInstance.post(`/receptionist/bookings/${id}/check-in`, payload).then((res) => res.data),
  checkOut: (id, payload) => axiosInstance.post(`/receptionist/bookings/${id}/check-out`, payload).then((res) => res.data),
  extend: (id, payload) => axiosInstance.post(`/receptionist/bookings/${id}/extend`, payload).then((res) => res.data),
  postponeCheckIn: (id, payload) => axiosInstance.post(`/receptionist/bookings/${id}/postpone`, payload).then((res) => res.data),
  receptionistList: (params) => axiosInstance.get("/receptionist/bookings", { params }).then((res) => res.data),
  listExtensionRequests: () => axiosInstance.get("/receptionist/extensions").then((res) => res.data),
  processExtensionRequest: (id, payload) => axiosInstance.patch(`/receptionist/extensions/${id}/process`, payload).then((res) => res.data),
  allAdmin: (params) => axiosInstance.get("/admin/bookings", { params }).then((res) => res.data),
  update: (id, payload) => axiosInstance.put(`/admin/bookings/${id}`, payload).then((res) => res.data),
  delete: (id) => axiosInstance.delete(`/admin/bookings/${id}`).then((res) => res.data),
};
