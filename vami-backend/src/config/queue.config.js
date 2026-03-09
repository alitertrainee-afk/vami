/**
 * Shared BullMQ Redis connection.
 *
 * BullMQ requires its own ioredis-compatible connection — it cannot share
 * the pub/sub Redis clients used by Socket.IO.  The `redis` (node-redis v4)
 * package is NOT ioredis-compatible, so we use BullMQ's built-in connection
 * which wraps ioredis internally.
 */
export const QUEUE_REDIS_CONNECTION = {
  host: process.env.REDIS_QUEUE_HOST || process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_QUEUE_PORT || process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // required by BullMQ
};

// Queue names — centralised so workers and producers stay in sync
export const QUEUE_NAMES = {
  MEDIA:  "media-processing",
};
