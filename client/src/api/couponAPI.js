import axiosInstance from "./axiosInstance";

export const couponAPI = {
  validate: (payload) => axiosInstance.post("/customer/coupons/validate", payload).then((res) => res.data),
  list: (params) => axiosInstance.get("/admin/coupons", { params }).then((res) => res.data),
  detail: (id) => axiosInstance.get(`/admin/coupons/${id}`).then((res) => res.data),
  create: (payload) => axiosInstance.post("/admin/coupons", payload).then((res) => res.data),
  update: (id, payload) => axiosInstance.put(`/admin/coupons/${id}`, payload).then((res) => res.data),
  setStatus: (id, status) => axiosInstance.patch(`/admin/coupons/${id}/status`, { status }).then((res) => res.data),
  delete: (id) => axiosInstance.delete(`/admin/coupons/${id}`).then((res) => res.data),
};
