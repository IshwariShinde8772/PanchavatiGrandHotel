import axiosInstance from "./axiosInstance";

export const inventoryAPI = {
  list: (params) => axiosInstance.get("/admin/inventory", { params }).then((res) => res.data),
  create: (payload) => axiosInstance.post("/admin/inventory", payload).then((res) => res.data),
  update: (id, payload) => axiosInstance.put(`/admin/inventory/${id}`, payload).then((res) => res.data),
  delete: (id) => axiosInstance.delete(`/admin/inventory/${id}`).then((res) => res.data),
};

