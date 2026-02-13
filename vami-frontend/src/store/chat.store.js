import { defineStore } from "pinia";
import { ChatService } from "@/services/chat.service";
import { socketClient } from "@/core/sockets/socket.client";

export const useChatStore = defineStore("chat", {
  state: () => ({
    conversations: [], // Array of chats for the sidebar
    activeChat: null, // The currently opened chat object
    messages: [], // Array of messages for the active chat
    isLoadingChats: false,
    isLoadingMessages: false,
    onlineUsers: new Set(), // Set of user IDs currently online
    typingUsers: new Set(), // Set of user IDs currently typing in the active chat
  }),

  actions: {
    // --------------------------------------------------
    // REST API Actions
    // --------------------------------------------------
    async loadConversations() {
      this.isLoadingChats = true;
      try {
        const response = await ChatService.fetchConversations();
        this.conversations = response.data.data || [];
      } catch (error) {
        console.error("Failed to load conversations:", error);
      } finally {
        this.isLoadingChats = false;
      }
    },

    async setActiveChat(chat) {
      this.activeChat = chat;
      this.messages = []; // Clear current messages immediately for UI perceived performance

      // Join the socket room
      socketClient.emit("join_room", chat?._id);

      this.isLoadingMessages = true;
      try {
        const response = await ChatService.fetchMessages(chat._id);
        this.messages = response.data.data || [];
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        this.isLoadingMessages = false;
      }
    },

    // --------------------------------------------------
    // Socket & Real-Time Actions
    // --------------------------------------------------
    initializeSocket(token) {
      socketClient.connect(token);

      // Listen for incoming messages globally
      socketClient.on("receive_message", (message) => {
        // 1. If the message belongs to the currently open chat, append it
        if (this.activeChat && this.activeChat._id === message.conversationId) {
          this.messages.push(message);
        }

        // 2. Update the sidebar's "latestMessage" so it bubbles to the top
        this.updateSidebarLatestMessage(message.conversationId, message);
      });

      // Listen for presence
      socketClient.on("user_status_update", ({ userId, isOnline }) => {
        if (isOnline) {
          this.onlineUsers.add(userId);
        } else {
          this.onlineUsers.delete(userId);
        }
      });
    },

    disconnectSocket() {
      socketClient.disconnect();
    },

    sendMessage(content) {
      if (!this.activeChat || !content.trim()) return;

      const payload = {
        roomId: this.activeChat._id,
        content: content.trim(),
      };

      // Emit to server
      socketClient.emit("send_message", payload);

      // Note: In a fully Optimistic UI, we would push a temporary message object here
      // with a 'pending' status, and resolve it when the server acknowledges.
      // For strict phase 1, we rely on the server broadcasting it back via 'receive_message'.
    },

    updateSidebarLatestMessage(chatId, message) {
      const chatIndex = this.conversations.findIndex((c) => c._id === chatId);
      if (chatIndex !== -1) {
        // Update message and move chat to the top of the array
        const chat = this.conversations[chatIndex];
        chat.latestMessage = message;
        this.conversations.splice(chatIndex, 1);
        this.conversations.unshift(chat);
      }
    },

    // Add this inside the actions {} block of your chat.store.js
    async setActiveChatFromUser(userId) {
      this.isLoadingMessages = true;
      try {
        // This hits the backend POST /chats endpoint we made earlier
        const response = await ChatService.accessChat(userId);
        const chat = response.data.data;

        // Now pass the resulting chat object to our existing setActiveChat logic
        await this.setActiveChat(chat);
        return chat;
      } catch (error) {
        console.error("Failed to create/access chat:", error);
        throw error;
      } finally {
        this.isLoadingMessages = false;
      }
    },
  },
});
