// local imports
import axiosInstance from "../api/axios.instance.js";

export const AuthService = {
  async login(credentials) {
    if (!credentials.email || !credentials.password) {
      throw new Error("Missing required credentials");
    }
    return await axiosInstance.post("/auth/login", credentials);
  },

  async register(userData) {
    return await axiosInstance.post("/auth/register", userData);
  },
};
