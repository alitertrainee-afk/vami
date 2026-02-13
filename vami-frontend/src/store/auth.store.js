// libs imports
import { defineStore } from "pinia";

// local imports
import { AuthService } from "../services/auth.service.js";
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from "../utils/localstorage.utils.js";

export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: JSON.parse(getLocalStorageItem("vami_user")) || null,
    token: getLocalStorageItem("vami_token") || null,
    isLoading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
  },

  actions: {
    async login(credentials) {
      this.isLoading = true;
      this.error = null;

      try {
        const response = await AuthService.login(credentials);

        // Destructure based on your backend ApiResponse format
        const { user, token } = response.data?.data;

        this.user = user;
        this.token = token;

        setLocalStorageItem("vami_token", token);
        setLocalStorageItem("vami_user", JSON.stringify(user));

        return true;
      } catch (err) {
        this.error = err.message;
        return false;
      } finally {
        this.isLoading = false;
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      this.error = null;
      removeLocalStorageItem("vami_token");
      removeLocalStorageItem("vami_user");
    },

    clearError() {
      this.error = null;
    },
  },
});
