import axiosInstance from "./axiosInstance";

export const workerAPI = {
  listMyTasks: () => axiosInstance.get("/worker/tasks").then((res) => res.data),
  updateMyTaskStatus: (id, payload) => axiosInstance.patch(`/worker/tasks/${id}`, payload).then((res) => res.data),
  getMySchedule: () => axiosInstance.get("/worker/schedule").then((res) => res.data),
  reportIssue: (payload) => axiosInstance.post("/worker/issues", payload).then((res) => res.data),
};

