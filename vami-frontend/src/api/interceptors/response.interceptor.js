// local imports
import { useAuthStore } from "../../store/auth.store.js";

export const setupResponseInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // Network error, timeout, or CORS failure — no response object
      if (!error.response) {
        return Promise.reject(
          new Error(error.message || "Network error — please check your connection"),
        );
      }

      const { status, data } = error.response;
      const message = data?.message || "An error occurred";

      if (status === 401) {
        const authStore = useAuthStore();
        authStore.logout();
        window.location.href = "/login";
      } else if (status === 403) {
        console.error(
          "Forbidden access - you don't have permission to access this resource.",
        );
      }

      return Promise.reject(new Error(message));
    },
  );
};
