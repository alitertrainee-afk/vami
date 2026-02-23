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
  state: () => {
    let user = null;
    try {
      const raw = getLocalStorageItem("vami_user");
      user = raw ? JSON.parse(raw) : null;
    } catch {
      removeLocalStorageItem("vami_user");
    }

    return {
      user,
      token: getLocalStorageItem("vami_token") || null,
      isLoading: false,
      error: null,
    };
  },

  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
  },

  actions: {
    async login(credentials) {
      this.isLoading = true;
      this.error = null;

      try {
        const response = await AuthService.login(credentials);
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

    async register(userData) {
      this.isLoading = true;
      this.error = null;

      try {
        const response = await AuthService.register(userData);
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

    async logout() {
      try {
        await AuthService.logout();
      } catch {
        // Proceed with local cleanup even if the server call fails
      }

      this.user = null;
      this.token = null;
      this.error = null;
      removeLocalStorageItem("vami_token");
      removeLocalStorageItem("vami_user");
    },


    async refreshAccessToken() {
      try {
        const response = await AuthService.refresh();
        const { user, token } = response.data?.data;

        this.user = user;
        this.token = token;

        setLocalStorageItem("vami_token", token);
        setLocalStorageItem("vami_user", JSON.stringify(user));

        return token;
      } catch {
        // Refresh failed — force logout
        await this.logout();
        return null;
      }
    },

    clearError() {
      this.error = null;
    },
  },
});
