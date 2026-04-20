import axiosInstance from "./axiosInstance";

export const maintenanceAPI = {
  listAdmin: (params) => axiosInstance.get("/admin/maintenance", { params }).then((res) => res.data),
  listReceptionist: (params) => axiosInstance.get("/receptionist/maintenance", { params }).then((res) => res.data),
  create: (payload) => axiosInstance.post("/receptionist/maintenance", payload).then((res) => res.data),
  assign: (id, payload) => axiosInstance.patch(`/admin/maintenance/${id}/assign`, payload).then((res) => res.data),
  resolve: (id, payload) => axiosInstance.patch(`/admin/maintenance/${id}/resolve`, payload).then((res) => res.data),
};
