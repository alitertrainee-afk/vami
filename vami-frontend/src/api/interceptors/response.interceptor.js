// local imports
import { useAuthStore } from "../../store/auth.store.js";

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const setupResponseInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      // Network error, timeout, or CORS failure — no response object
      if (!error.response) {
        return Promise.reject(
          new Error(error.message || "Network error — please check your connection"),
        );
      }

      const originalRequest = error.config;
      const { status, data } = error.response;
      const message = data?.message || "An error occurred";

      // Skip refresh for the refresh endpoint itself (prevents infinite loop)
      if (status === 401 && !originalRequest._retry && !originalRequest.url?.includes("/auth/refresh")) {
        if (isRefreshing) {
          // Queue this request while a refresh is in progress
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const authStore = useAuthStore();
          const newToken = await authStore.refreshAccessToken();

          if (newToken) {
            processQueue(null, newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return axiosInstance(originalRequest);
          } else {
            processQueue(new Error("Refresh failed"));
            window.location.href = "/login";
            return Promise.reject(new Error("Session expired"));
          }
        } catch (refreshError) {
          processQueue(refreshError);
          window.location.href = "/login";
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      if (status === 403) {
        console.error(
          "Forbidden access - you don't have permission to access this resource.",
        );
      }

      return Promise.reject(new Error(message));
    },
  );
};
