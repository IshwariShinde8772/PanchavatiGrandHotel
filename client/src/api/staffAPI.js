import axiosInstance from "./axiosInstance";

export const staffAPI = {
  list: () => axiosInstance.get("/admin/staff").then((res) => res.data),
  create: (payload) => axiosInstance.post("/admin/staff", payload).then((res) => res.data),
  update: (id, payload) => axiosInstance.put(`/admin/staff/${id}`, payload).then((res) => res.data),
  delete: (id) => axiosInstance.delete(`/admin/staff/${id}`).then((res) => res.data),
  toggleActive: (id) => axiosInstance.patch(`/admin/staff/${id}/toggle-active`).then((res) => res.data),
  resetPassword: (id) => axiosInstance.post(`/admin/staff/${id}/reset-password`).then((res) => res.data),
};
