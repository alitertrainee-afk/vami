import { pubClient } from "../config/redis.config.js";

const DEFAULT_TTL = 300; // 5 minutes

/**
 * Get a value from Redis cache.
 * @param {string} key - Cache key
 * @returns {Promise<Object|null>} Parsed JSON value or null
 */
export const cacheGet = async (key) => {
    try {
        const data = await pubClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

/**
 * Set a value in Redis cache with TTL.
 * @param {string} key - Cache key
 * @param {Object} value - Value to cache (will be JSON-serialized)
 * @param {number} [ttl=300] - Time-to-live in seconds
 */
export const cacheSet = async (key, value, ttl = DEFAULT_TTL) => {
    try {
        await pubClient.set(key, JSON.stringify(value), { EX: ttl });
    } catch {
        // Silently fail — cache is optional, DB is the source of truth
    }
};

/**
 * Delete a cached value.
 * @param {string} key - Cache key
 */
export const cacheDel = async (key) => {
    try {
        await pubClient.del(key);
    } catch {
        // Silently fail
    }
};

/**
 * Delete all cache keys matching a pattern.
 * @param {string} pattern - Glob pattern (e.g., "user:*")
 */
export const cacheDelPattern = async (pattern) => {
    try {
        const keys = await pubClient.keys(pattern);
        if (keys.length > 0) {
            await pubClient.del(keys);
        }
    } catch {
        // Silently fail
    }
};

// Cache key builders
export const CACHE_KEYS = {
    user: (id) => `user:${id}`,
    userChats: (id) => `user_chats:${id}`,
};
