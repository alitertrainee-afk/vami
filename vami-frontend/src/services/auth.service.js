// local imports
import axiosInstance from "../api/axios.instance.js";

export const AuthService = {
  async login(credentials) {
    if ((!credentials.email && !credentials.username) || !credentials.password) {
      throw new Error("Email or username and password are required");
    }
    return await axiosInstance.post("/auth/login", credentials);
  },

  async register(userData) {
    return await axiosInstance.post("/auth/register", userData);
  },

  async refresh() {
    return await axiosInstance.post("/auth/refresh");
  },

  async logout() {
    return await axiosInstance.post("/auth/logout");
  },
};
