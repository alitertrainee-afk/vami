// libs imports
import { createRouter, createWebHistory } from "vue-router";

// local imports
import { useAuthStore } from "../store/auth.store.js";

const routes = [
  {
    path: "/",
    redirect: "/chat",
  },
  {
    path: "/login",
    name: "Login",
    component: () => import("../pages/auth/LoginPage.vue"),
    meta: { requiresGuest: true },
  },
  {
    // Placeholder for when we build the register view
    path: "/register",
    name: "Register",
    component: () => import("../pages/auth/RegisterPage.vue"),
    meta: { requiresGuest: true },
  },
  {
    path: "/chat",
    name: "Chat",
    // Lazy-loading the chat module so we don't load heavy socket logic on the login screen
    component: () => import("../pages/chat/ChatPage.vue"),
    meta: { requiresAuth: true }, // Strict lock
  },
  {
    // Catch-all 404
    path: "/:pathMatch(.*)*",
    redirect: "/chat",
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  // Strict scroll behavior for a native app feel
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 };
  },
});

// 🛡️ Global Navigation Guard (The Firewall)
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const isAuthenticated = authStore.isAuthenticated;

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest);

  if (requiresAuth && !isAuthenticated) {
    // Unauthorized access attempt -> Kick to login
    next({ name: "Login", query: { redirect: to.fullPath } });
  } else if (requiresGuest && isAuthenticated) {
    // Authenticated user trying to access login/register -> Kick to app
    next({ name: "Chat" });
  } else {
    // Safe to proceed
    next();
  }
});

export default router;
