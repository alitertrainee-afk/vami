// local imports
import axiosInstance from "../api/axios.instance";

export const UserService = {
  async searchUsers(query) {
    if (!query) return { data: [] };
    return await axiosInstance.get(`/users?search=${query}`);
  },
};
