import axiosInstance from "./axiosInstance";

export const seasonalAPI = {
  list: () => axiosInstance.get("/admin/seasonal-pricing").then((res) => res.data),
  create: (payload) => axiosInstance.post("/admin/seasonal-pricing", payload).then((res) => res.data),
  update: (id, payload) => axiosInstance.put(`/admin/seasonal-pricing/${id}`, payload).then((res) => res.data),
  delete: (id) => axiosInstance.delete(`/admin/seasonal-pricing/${id}`).then((res) => res.data),
};
