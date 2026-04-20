import axiosInstance from "./axiosInstance";

export const billAPI = {
  getByBooking: (bookingId) => axiosInstance.get(`/customer/bills/${bookingId}`).then((res) => res.data),
  downloadUrl: (bookingId) => `${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"}/customer/bills/${bookingId}/download`,
  generate: (payload) => axiosInstance.post("/receptionist/bills/generate", payload).then((res) => res.data),
};

