import { uploadAPI } from "../api/uploadAPI";

export async function openSecurePhoto({ type, id }) {
  const response = await uploadAPI.securePhotoUrl({ type, id });
  const url = response?.data?.url;
  if (!url) {
    throw new Error("Photo URL is not available");
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
