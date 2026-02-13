// libs imports
import { getLocalStorageItem } from "../../utils/localstorage.utils";

export const setupRequestInterceptor = (axiosInstance) => {
  axiosInstance.interceptors.request.use(
    (config) => {
      const authToken = getLocalStorageItem("vami_token");
      if (authToken) config.headers.Authorization = `Bearer ${authToken}`;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    },
  );
};
