import axios from "axios";
import { useAuthStore } from "../store/authStore";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
});

let isHandlingUnauthorizedRedirect = false;

function readTokenFromPersistedStore() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem("panchavati-auth");
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token;
    return typeof token === "string" && token.trim() ? token : null;
  } catch (error) {
    return null;
  }
}

function getAuthToken() {
  const inMemoryToken = useAuthStore.getState().token;
  if (typeof inMemoryToken === "string" && inMemoryToken.trim()) {
    return inMemoryToken;
  }

  return readTokenFromPersistedStore();
}

function isAuthEndpoint(config) {
  const url = String(config?.url || "");
  return /\/auth\/(login|customer\/login|admin\/login|staff\/login|send-otp|verify-otp|forgot-password|reset-password|oauth\/exchange)/i.test(url);
}

axiosInstance.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401 && !isAuthEndpoint(error?.config)) {
      const token = getAuthToken();

      if (token) {
        useAuthStore.getState().logout();

        if (typeof window !== "undefined" && !isHandlingUnauthorizedRedirect) {
          isHandlingUnauthorizedRedirect = true;
          const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
          const redirectTo = encodeURIComponent(currentPath);

          if (!window.location.pathname.startsWith("/login")) {
            window.location.assign(`/login?reason=session_expired&redirectTo=${redirectTo}`);
          }
        }
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

