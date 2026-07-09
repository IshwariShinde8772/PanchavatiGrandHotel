import axiosInstance from "./axiosInstance";

export const uploadAPI = {
  cloudinary: (file, purpose) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("purpose", purpose);
    return axiosInstance.post("/upload/cloudinary", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((res) => res.data);
  },
  securePhotoUrl: (params) => axiosInstance.get("/upload/secure-photo-url", { params }).then((res) => res.data),
};
