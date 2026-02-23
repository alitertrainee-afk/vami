// local configss
import { pubClient } from "../config/redis.config.js";

// constants
const DEFAULT_TTL = 300; // 5 minutes


export const cacheGet = async (key) => {
    try {
        const data = await pubClient.get(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
};

export const cacheSet = async (key, value, ttl = DEFAULT_TTL) => {
    try {
        await pubClient.set(key, JSON.stringify(value), { EX: ttl });
    } catch {
        // Silently fail — cache is optional, DB is the source of truth
    }
};


export const cacheDel = async (key) => {
    try {
        await pubClient.del(key);
    } catch {
        // Silently fail
    }
};

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
