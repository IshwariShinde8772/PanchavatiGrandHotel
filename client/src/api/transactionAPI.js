import axiosInstance from "./axiosInstance";

export const transactionAPI = {
  mine: () => axiosInstance.get("/customer/transactions").then((res) => res.data),
  confirm: (id, payload = {}) => axiosInstance.post(`/customer/transactions/${id}/confirm`, payload).then((res) => res.data),
  regenerateQr: (id) => axiosInstance.post(`/customer/transactions/${id}/regenerate-qr`).then((res) => res.data),
  delete: (id) => axiosInstance.delete(`/customer/transactions/${id}`).then((res) => res.data),
  clearAll: () => axiosInstance.delete(`/customer/transactions`).then((res) => res.data),
};
