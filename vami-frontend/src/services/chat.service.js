// local imports
import axiosInstance from "../api/axios.instance.js";

export const ChatService = {
  async fetchConversations() {
    return await axiosInstance.get("/chats");
  },

  async accessChat(userId) {
    return await axiosInstance.post("/chats", { userId });
  },

  async fetchMessages(chatId) {
    return await axiosInstance.get(`/messages/${chatId}`);
  },
};
