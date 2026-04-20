import axiosInstance from "./axiosInstance";

export const offerAPI = {
  list: () => axiosInstance.get("/admin/offers").then((res) => res.data),
  create: (payload) => axiosInstance.post("/admin/offers", payload).then((res) => res.data),
  update: (id, payload) => axiosInstance.put(`/admin/offers/${id}`, payload).then((res) => res.data),
  delete: (id) => axiosInstance.delete(`/admin/offers/${id}`).then((res) => res.data),
};
