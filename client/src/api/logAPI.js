import axiosInstance from "./axiosInstance";

export const logAPI = {
  list: (params) => axiosInstance.get("/admin/logs", { params }).then((res) => res.data),
  updateStatus: (enabled) => axiosInstance
    .patch("/admin/logs/status", { enabled })
    .then((res) => res.data),
};
