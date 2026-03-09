// libs imports
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

// local configs
import { pubClient } from "../config/redis.config.js";

// constants for rate limiting
const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const API_WINDOW_MS = 1 * 60 * 1000;   // 1 minute
const MAX_AUTH_REQUESTS = 50;
const MAX_API_REQUESTS = 10000;

/**
 * Build a rate-limiter lazily — RedisStore's constructor calls SCRIPT LOAD
 * on the Redis client, so it must not run until after Redis.connect() completes
 * (which happens asynchronously in server.js before the HTTP server opens).
 * We silence the ERR_ERL_CREATED_IN_REQUEST_HANDLER validation because we
 * intentionally create the instance inside the first request — it is still a
 * singleton (created once and cached), so behaviour is identical to app-init.
 */
function makeLimiter(windowMs, max, message, prefix) {
  let instance = null;

  return (req, res, next) => {
    if (!instance) {
      instance = rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        // Disable the "created in request handler" check — our singleton IS
        // effectively app-level, just deferred until Redis is ready.
        validate: { creationStack: false },
        store: new RedisStore({
          sendCommand: (...args) => pubClient.sendCommand(args),
          prefix,
        }),
        message: { success: false, message },
      });
    }
    return instance(req, res, next);
  };
}

export const authLimiter = makeLimiter(
  AUTH_WINDOW_MS,
  MAX_AUTH_REQUESTS,
  "Too many authentication attempts. Try again later.",
  "rl:auth:",
);

export const apiLimiter = makeLimiter(
  API_WINDOW_MS,
  MAX_API_REQUESTS,
  "Too many requests. Please slow down.",
  "rl:api:",
);
