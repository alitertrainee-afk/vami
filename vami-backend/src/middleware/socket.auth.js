// local utilities
import { verifyJWTToken } from "../utils/jwt.utils.js";
import { cacheGet, cacheSet, CACHE_KEYS } from "../utils/cache.js";

// local repository
import { findUserById } from "../repository/user.repository.js";

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decoded = verifyJWTToken(token);

    if (!decoded) {
      return next(new Error("Authentication error: Invalid token"));
    }

    // Try cache first, fall back to DB
    const cacheKey = CACHE_KEYS.user(decoded?.id);
    let user = await cacheGet(cacheKey);

    if (!user) {
      user = await findUserById(decoded.id);

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      // Cache for 5 minutes — subsequent connections/events skip the DB
      await cacheSet(cacheKey, user, 300);
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Authentication error: Invalid token"));
  }
};

export default socketAuth;
