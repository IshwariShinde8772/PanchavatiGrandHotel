import axiosInstance from "./axiosInstance";

export const taskAPI = {
  listReceptionTasks: (params) => axiosInstance.get("/receptionist/tasks", { params }).then((res) => res.data),
  listAssignableStaff: (params) => axiosInstance.get("/receptionist/staff", { params }).then((res) => res.data),
  createReceptionTask: (payload) => axiosInstance.post("/receptionist/tasks", payload).then((res) => res.data),
  assignReceptionTask: (id, payload) => axiosInstance.patch(`/receptionist/tasks/${id}/assign`, payload).then((res) => res.data),
  updateReceptionTaskStatus: (id, payload) => axiosInstance.patch(`/receptionist/tasks/${id}/status`, payload).then((res) => res.data),
};
