import axiosInstance from "./axiosInstance";

export const roomAPI = {
  getHome: () => axiosInstance.get("/home").then((res) => res.data),
  getRooms: (params) => axiosInstance.get("/rooms", { params }).then((res) => res.data),
  getRoom: (id, params) => axiosInstance.get(`/rooms/${id}`, { params }).then((res) => res.data),
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append("image", file);

    return axiosInstance.post("/upload/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((res) => res.data);
  },
  saveRoom: (room_id) => axiosInstance.post("/customer/saved-rooms", { room_id }).then((res) => res.data),
  getSavedRooms: () => axiosInstance.get("/customer/saved-rooms").then((res) => res.data),
  removeSavedRoom: (roomId) => axiosInstance.delete(`/customer/saved-rooms/${roomId}`).then((res) => res.data),
  listAdminRooms: () => axiosInstance.get("/admin/rooms").then((res) => res.data),
  getReceptionistRoomGrid: () => axiosInstance.get("/receptionist/room-grid").then((res) => res.data),
  createRoom: (payload) => axiosInstance.post("/admin/rooms", payload).then((res) => res.data),
  updateRoom: (id, payload) => axiosInstance.put(`/admin/rooms/${id}`, payload).then((res) => res.data),
  deleteRoom: (id) => axiosInstance.delete(`/admin/rooms/${id}`).then((res) => res.data),
};
