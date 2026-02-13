// libs imports
import axios from "axios";

// local imports
import { setupRequestInterceptor } from "./interceptors/request.interceptor.js";
import { setupResponseInterceptor } from "./interceptors/response.interceptor.js";

export const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

setupRequestInterceptor(axiosInstance);
setupResponseInterceptor(axiosInstance);

export default axiosInstance;
