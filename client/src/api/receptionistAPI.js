import axiosInstance from "./axiosInstance";

export const receptionistAPI = {
  listNotifications: (params) => axiosInstance.get("/receptionist/notifications", { params }).then((res) => res.data),
  sendNotificationToCustomer: (payload) => axiosInstance.post("/receptionist/notifications", payload).then((res) => res.data),
  markNotificationRead: (id) => axiosInstance.patch(`/receptionist/notifications/${id}/read`).then((res) => res.data),
  deleteNotification: (id) => axiosInstance.delete(`/receptionist/notifications/${id}`).then((res) => res.data),
};
