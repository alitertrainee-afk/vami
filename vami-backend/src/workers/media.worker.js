/**
 * Media-processing worker.
 *
 * Run separately from the API process so CPU-intensive tasks (sharp, ffmpeg)
 * never block the Express event loop:
 *
 *   node src/workers/media.worker.js
 *
 * Or add to docker-compose as a dedicated "worker" service that shares the
 * same image as the API but has a different CMD.
 *
 * Responsibilities:
 *   1. Download the uploaded file from S3.
 *   2. Generate a thumbnail (images: sharp; videos: ffmpeg — if available).
 *   3. Upload the thumbnail to S3 under the "thumbnails/" prefix.
 *   4. Update the Message document with thumbnailKey + thumbnailUrl.
 */

import "dotenv/config";
import path from "path";
import { Readable } from "stream";
import { Worker } from "bullmq";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

import { QUEUE_REDIS_CONNECTION, QUEUE_NAMES } from "../config/queue.config.js";
import s3Client, { S3_BUCKET }                  from "../config/s3.config.js";
import Message                                   from "../models/Message.js";
import connectDB                                 from "../config/database.config.js";

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Download an S3 object and return its body as a Buffer.
 */
const downloadFromS3 = async (key) => {
  const cmd = new GetObjectCommand({ Bucket: S3_BUCKET, Key: key });
  const { Body } = await s3Client.send(cmd);
  const chunks = [];
  for await (const chunk of Body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

/**
 * Upload a Buffer to S3 and return the public-facing URL.
 */
const uploadToS3 = async (key, buffer, contentType) => {
  const cmd = new PutObjectCommand({
    Bucket:      S3_BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
  });
  await s3Client.send(cmd);

  // Build the URL the same way the presigner does
  if (process.env.S3_ENDPOINT) {
    return `${process.env.S3_ENDPOINT}/${S3_BUCKET}/${key}`;
  }
  return `https://${S3_BUCKET}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com/${key}`;
};

/**
 * Generate a 320×320 JPEG thumbnail for an image using sharp.
 */
const generateImageThumbnail = async (buffer) => {
  return sharp(buffer)
    .resize(320, 320, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 75 })
    .toBuffer();
};

// --------------------------------------------------------------------------
// Worker processor
// --------------------------------------------------------------------------

const processMediaJob = async (job) => {
  const { messageId, mediaKey, mediaType, mimetype } = job.data;

  console.log(`[MediaWorker] Processing job ${job.id} — type: ${mediaType}, key: ${mediaKey}`);

  // Only images get thumbnails for now.
  // Extend here with fluent-ffmpeg for video when you add that dependency.
  const isImage = mediaType === "image" || (mimetype && mimetype.startsWith("image/"));
  if (!isImage) {
    console.log(`[MediaWorker] Skipping thumbnail for type: ${mediaType}`);
    return;
  }

  // 1. Download original
  const originalBuffer = await downloadFromS3(mediaKey);

  // 2. Generate thumbnail
  const thumbnailBuffer = await generateImageThumbnail(originalBuffer);

  // 3. Upload thumbnail
  const ext          = path.extname(mediaKey) || ".jpg";
  const thumbnailKey = `thumbnails/${path.basename(mediaKey, ext)}_thumb.jpg`;
  const thumbnailUrl = await uploadToS3(thumbnailKey, thumbnailBuffer, "image/jpeg");

  // 4. Persist back to Message
  await Message.findByIdAndUpdate(messageId, { thumbnailKey, thumbnailUrl });

  console.log(`[MediaWorker] Thumbnail saved: ${thumbnailUrl}`);
};

// --------------------------------------------------------------------------
// Bootstrap: connect DB then start worker
// --------------------------------------------------------------------------

(async () => {
  await connectDB();

  const worker = new Worker(QUEUE_NAMES.MEDIA, processMediaJob, {
    connection: QUEUE_REDIS_CONNECTION,
    concurrency: 4, // process up to 4 media jobs simultaneously
  });

  worker.on("completed", (job) => {
    console.log(`[MediaWorker] ✅ Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[MediaWorker] ❌ Job ${job?.id} failed:`, err.message);
  });

  console.log("[MediaWorker] 🎬 Media processing worker started");
})();
