import axiosInstance from "./axiosInstance";

export const settingsAPI = {
  public: () => axiosInstance.get("/settings/public").then((res) => res.data),
  get: () => axiosInstance.get("/admin/settings").then((res) => res.data),
  update: (payload) => axiosInstance.put("/admin/settings", payload).then((res) => res.data),
};
