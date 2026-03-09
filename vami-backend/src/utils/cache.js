// local configs
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

/**
 * Safe pattern-based cache invalidation using SCAN.
 * Never uses KEYS — KEYS is O(n) and blocks Redis.
 */
export const cacheDelPattern = async (pattern) => {
    try {
        let cursor = 0;
        do {
            const reply = await pubClient.scan(cursor, {
                MATCH: pattern,
                COUNT: 200,
            });
            cursor = reply.cursor;
            if (reply.keys.length > 0) {
                await pubClient.del(reply.keys);
            }
        } while (cursor !== 0);
    } catch {
        // Silently fail
    }
};

// ---------------------------------------------------------------------------
// Refresh-token blacklist (Redis-backed, zero extra DB round-trips)
// ---------------------------------------------------------------------------

/**
 * Blacklist a refresh-token JTI. TTL should match the token's remaining
 * lifetime so Redis auto-expires the entry.
 */
export const blacklistRefreshToken = async (jti, ttlSeconds) => {
    try {
        await pubClient.set(`rt:bl:${jti}`, "1", { EX: ttlSeconds });
    } catch {
        // Silently fail — token will eventually expire anyway
    }
};

/** Returns true when the JTI has been blacklisted (revoked). */
export const isRefreshTokenBlacklisted = async (jti) => {
    try {
        const val = await pubClient.get(`rt:bl:${jti}`);
        return val !== null;
    } catch {
        return false;
    }
};

// ---------------------------------------------------------------------------
// Email-verification tokens (Redis-backed, 24-hour TTL)
// ---------------------------------------------------------------------------

export const setEmailVerificationToken = async (token, userId) => {
    try {
        await pubClient.set(`ev:${token}`, userId.toString(), { EX: 86400 });
    } catch {
        // Silently fail
    }
};

export const getEmailVerificationToken = async (token) => {
    try {
        return await pubClient.get(`ev:${token}`);
    } catch {
        return null;
    }
};

export const deleteEmailVerificationToken = async (token) => {
    try {
        await pubClient.del(`ev:${token}`);
    } catch {
        // Silently fail
    }
};

// Cache key builders
export const CACHE_KEYS = {
    user: (id) => `user:${id}`,
    userChats: (id) => `user_chats:${id}`,
};
