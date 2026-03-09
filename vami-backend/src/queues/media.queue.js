// libs imports
import { Queue } from "bullmq";

// local config
import { QUEUE_REDIS_CONNECTION, QUEUE_NAMES } from "../config/queue.config.js";

/**
 * Media-processing queue.
 *
 * Produces jobs when a media message is sent.  The worker (media.worker.js)
 * consumes them and:
 *   - Generates image thumbnails (via sharp)
 *   - Extracts video thumbnails (via ffmpeg — optional, skip if not installed)
 *   - Writes thumbnailKey + thumbnailUrl back to the Message document
 *
 * Job payload shape:
 * {
 *   messageId:    string,   // Message._id
 *   mediaKey:     string,   // S3 object key of the uploaded file
 *   mediaType:    string,   // "image" | "video" | "audio" | "document" | "voice"
 *   mimetype:     string,   // original MIME type from client
 * }
 */
export const mediaQueue = new Queue(QUEUE_NAMES.MEDIA, {
  connection: QUEUE_REDIS_CONNECTION,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail:     { count: 200 },
  },
});

/**
 * Enqueue a thumbnail-generation job.
 * Fire-and-forget — the caller never awaits the worker result.
 */
export const enqueueMediaProcessing = async ({ messageId, mediaKey, mediaType, mimetype }) => {
  try {
    await mediaQueue.add(
      "process",
      { messageId, mediaKey, mediaType, mimetype },
      { jobId: `media:${messageId}` }, // deduplicate: one job per message
    );
  } catch (err) {
    // Queue is best-effort — never block message delivery
    console.error("[MediaQueue] Failed to enqueue:", err.message);
  }
};
