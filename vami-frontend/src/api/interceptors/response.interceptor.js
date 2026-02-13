// local imports
import { removeLocalStorageItem } from "../../utils/localstorage.utils.js";

export const setupResponseInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      // You can handle specific status codes here
      if (error.response) {
        const {
          status,
          data: { message },
        } = error.response;
        if (status === 401) {
          removeLocalStorageItem("vami_token");
          window.location.href = "/login";
        } else if (status === 403) {
          // Handle forbidden access
          console.error(
            "Forbidden access - you don't have permission to access this resource.",
          );
        }
      }
      return Promise.reject(new Error(message || "An error occurred"));
    },
  );
};
