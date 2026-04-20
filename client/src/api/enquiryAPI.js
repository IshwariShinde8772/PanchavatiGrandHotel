import axiosInstance from "./axiosInstance";

export const enquiryAPI = {
  create: (payload) => axiosInstance.post("/enquiries", payload).then((res) => res.data),
  list: () => axiosInstance.get("/admin/enquiries").then((res) => res.data),
  receptionistList: () => axiosInstance.get("/receptionist/enquiries").then((res) => res.data),
  respond: (id, payload) => axiosInstance.patch(`/admin/enquiries/${id}/respond`, payload).then((res) => res.data),
  receptionistRespond: (id, payload) => axiosInstance.patch(`/receptionist/enquiries/${id}/respond`, payload).then((res) => res.data),
  delete: (id) => axiosInstance.delete(`/admin/enquiries/${id}`).then((res) => res.data),
};

