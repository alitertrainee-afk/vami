// libs import
import { defineStore } from "pinia";

// local imports
import { ChatService } from "@/services/chat.service";
import { socketClient } from "@/lib/socket.client";
import { UserService } from "@/services/user.service"; // <-- Added for global user search
import { useAuthStore } from "./auth.store"; // <-- Added to get current user ID for chat filtering

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
      error: null,

      // --- NEW STATE: Search & Filters ---
      activeFilter: "all",
      searchQuery: "",
      searchResults: [],
      isSearching: false,
    };
  },

  getters: {
    unreadMessagesTotal(state) {
      return state.conversations.reduce(
        (total, chat) => total + (chat?.unreadCount || 0),
        0,
      );
    },

    unreadChatsCount(state) {
      return state.conversations.filter((chat) => chat?.unreadCount > 0).length;
    },

    // Compute the list of chats based on BOTH the active tab and the search input
    filteredConversations(state) {
      const authStore = useAuthStore();
      const currentUserId = authStore.user?._id;

      return state.conversations.filter((chat) => {
        // 1. FILTER BY TAB
        if (state.activeFilter === "unread" && !(chat?.unreadCount > 0))
          return false;
        if (state.activeFilter === "groups" && !chat?.isGroupChat) return false;
        if (state.activeFilter === "favourites" && !chat?.isPinned)
          return false;

        // 2. FILTER BY SEARCH QUERY (Local Conversation Search)
        if (state.searchQuery.trim()) {
          const query = state.searchQuery.toLowerCase();
          let chatName = "";

          if (chat?.isGroupChat) {
            chatName = chat.chatName || "";
          } else {
            const otherUser = chat?.participants?.find(
              (p) => p?._id !== currentUserId,
            );
            chatName = otherUser?.username || "Unknown User";
          }

          if (!chatName.toLowerCase().includes(query)) return false;
        }

        return true;
      });
    },
  },

  actions: {
    // --------------------------------------------------
    // Search & Filter Actions (NEW)
    // --------------------------------------------------
    setFilter(filterKey) {
      this.activeFilter = filterKey;
    },

    async handleSearch(query) {
      this.searchQuery = query;

      if (!query.trim()) {
        this.searchResults = [];
        return;
      }

      this.isSearching = true;
      try {
        // Fetch global users for starting new chats based on the query
        const response = await UserService.searchUsers(query);
        this.searchResults = response.data.data || [];
      } catch (error) {
        console.error("Search failed:", error);
        this.searchResults = [];
      } finally {
        this.isSearching = false;
      }
    },

    // --------------------------------------------------
    // REST API Actions
    // --------------------------------------------------
    async loadConversations() {
      this.isLoadingChats = true;
      try {
        const response = await ChatService.fetchConversations();
        this.conversations = response.data.data || [];
      } catch (error) {
        this.error = error?.response?.data?.message || "Failed to load conversations";
        console.error("Failed to load conversations:", error);
      } finally {
        this.isLoadingChats = false;
      }
    },

    async setActiveChat(chat) {
      // Leave previous room to prevent room accumulation
      if (this.activeChat) {
        socketClient.emit("leave_room", this.activeChat._id);
      }

      this.activeChat = chat;
      this.messages = [];
      this.currentPage = 1;
      this.pagination = null;
      this.typingUsers = new Set();

      if (!chat) return;

      socketClient.emit("join_room", chat._id);
      socketClient.emit("mark_as_read", chat._id);

      // Reset local unread count for this conversation
      const idx = this.conversations.findIndex((c) => c._id === chat._id);
      if (idx !== -1) {
        this.conversations[idx].unreadCount = 0;
      }

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
        this.error = error?.response?.data?.message || "Failed to load messages";
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

    async setActiveChatFromUser(userId) {
      try {
        // This hits the backend POST /chats endpoint
        const response = await ChatService.accessChat(userId);
        const chat = response.data.data;

        // Delegate all loading state management to setActiveChat
        await this.setActiveChat(chat);
        return chat;
      } catch (error) {
        this.error = error?.response?.data?.message || "Failed to access chat";
        console.error("Failed to create/access chat:", error);
        throw error;
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
        if (this.activeChat && this.activeChat?._id === message.conversation) {
          this.messages.push(message);
        }

        // 2. Update the sidebar's "latestMessage" so it bubbles to the top
        this.updateSidebarLatestMessage(message?.conversation, message);
      });

      // Sidebar unread count bump for background chats
      socketClient.on("new_message_notification", ({ chatId }) => {
        // Skip if already viewing this chat
        if (this.activeChat?._id === chatId) return;

        const idx = this.conversations.findIndex((c) => c._id === chatId);
        if (idx !== -1) {
          this.conversations[idx].unreadCount =
            (this.conversations[idx].unreadCount || 0) + 1;
        }
      });

      // Listen for presence
      socketClient.on("user_status_update", ({ userId, isOnline }) => {
        if (isOnline) {
          this.onlineUsers.add(userId);
        } else {
          this.onlineUsers.delete(userId);
        }
      });

      // Typing indicators
      socketClient.on("user_typing", ({ userId, roomId }) => {
        if (this.activeChat?._id === roomId) {
          this.typingUsers.add(userId);
        }
      });

      socketClient.on("user_stopped_typing", ({ userId }) => {
        this.typingUsers.delete(userId);
      });
    },

    disconnectSocket() {
      // Clean up all listeners before disconnecting to prevent memory leaks
      socketClient.off("receive_message");
      socketClient.off("new_message_notification");
      socketClient.off("user_status_update");
      socketClient.off("user_typing");
      socketClient.off("user_stopped_typing");
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
  },
});
