import axiosInstance from "./axiosInstance";

export const amenityAPI = {
  list: (params) => axiosInstance.get("/admin/amenities", { params }).then((res) => res.data),
  create: (payload) => axiosInstance.post("/admin/amenities", payload).then((res) => res.data),
  update: (id, payload) => axiosInstance.put(`/admin/amenities/${id}`, payload).then((res) => res.data),
  remove: (id) => axiosInstance.delete(`/admin/amenities/${id}`).then((res) => res.data),
};
