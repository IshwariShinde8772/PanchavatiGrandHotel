import axiosInstance from "./axiosInstance";

export const feedbackAPI = {
  published: () => axiosInstance.get("/feedbacks/published").then((res) => res.data),
  submit: (payload) => axiosInstance.post("/customer/feedbacks", payload).then((res) => res.data),
  adminList: (params) => axiosInstance.get("/admin/feedbacks", { params }).then((res) => res.data),
  moderate: (id, payload) => axiosInstance.patch(`/admin/feedbacks/${id}`, payload).then((res) => res.data),
  delete: (id) => axiosInstance.delete(`/admin/feedbacks/${id}`).then((res) => res.data),
};

