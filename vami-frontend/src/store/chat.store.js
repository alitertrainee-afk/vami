// libs import
import { defineStore } from "pinia";

// local imports
import { ChatService } from "@/services/chat.service";
import { socketClient } from "@/core/sockets/socket.client";

export const useChatStore = defineStore("chat", {
  state: () => {
    return {
    conversations: [],
    activeChat: null,
    messages: [],
    pagination: null,
    currentPage: 1,
    isLoadingChats: false,
    isLoadingMessages: false,
    onlineUsers: new Set(),
    typingUsers: new Set(),
  };
  },

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
      this.messages = [];
      this.currentPage = 1;
      this.pagination = null;

      socketClient.emit("join_room", chat?._id);

      this.isLoadingMessages = true;
      try {
        const response = await ChatService.fetchMessages(chat._id, {
          page: 1,
          limit: 20,
        });

        const { messages, pagination } = response.data.data;

        this.messages = messages;
        this.pagination = pagination;
      } catch (error) {
        console.error("Failed to load messages:", error);
      } finally {
        this.isLoadingMessages = false;
      }
    },

    async loadMoreMessages() {
      if (!this.pagination?.hasNext || this.isLoadingMessages) return;

      this.isLoadingMessages = true;

      try {
        const nextPage = this.currentPage + 1;

        const response = await ChatService.fetchMessages(this.activeChat._id, {
          page: nextPage,
          limit: 20,
        });

        const { messages, pagination } = response.data.data;

        // Prepend older messages
        this.messages = [...messages, ...this.messages];

        this.currentPage = nextPage;
        this.pagination = pagination;
      } catch (error) {
        console.error("Failed to load more messages:", error);
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
        if (this.activeChat && this.activeChat?._id === message.conversationId) {
          this.messages.push(message);
        }

        // 2. Update the sidebar's "latestMessage" so it bubbles to the top
        this.updateSidebarLatestMessage(message?.conversationId, message);                                                                                    
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
        roomId: this.activeChat?._id,
        content: content.trim(),
      };

      // Emit to server
      socketClient.emit("send_message", payload);
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
