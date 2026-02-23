// libs imports
import { rateLimit } from "express-rate-limit";

// constants for rate limiting
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const API_WINDOW_MS = 1 * 60 * 1000; // 1 minute
const MAX_AUTH_REQUESTS = 50;
const MAX_API_REQUESTS = 100;

export const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW_MS,
  max: MAX_AUTH_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many authentication attempts. Try again later.",
  },
});

export const apiLimiter = rateLimit({
  windowMs: API_WINDOW_MS,
  max: MAX_API_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,

  message: {
    success: false,
    message: "Too many requests. Please slow down.",
  },
});
