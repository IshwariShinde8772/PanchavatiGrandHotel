import axiosInstance from "./axiosInstance";

export const refundAPI = {
  list: (portal, params) => axiosInstance.get(`/${portal}/refunds`, { params }).then((res) => res.data),
  approve: (id) => axiosInstance.patch(`/admin/refunds/${id}/approve`).then((res) => res.data),
  reject: (id, reason) => axiosInstance.patch(`/admin/refunds/${id}/reject`, { reason }).then((res) => res.data),
};
