// libs imports
import { PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import path from "path";

// local config
import s3Client, { S3_BUCKET } from "../config/s3.config.js";

// local utilities
import { ApiError } from "../utils/ApiError.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Presigned PUT URL is valid for 10 minutes. */
const PRESIGN_EXPIRES_IN = 10 * 60;

/**
 * Allowed MIME types and their canonical message type.
 * Anything not in this map is rejected.
 */
const MIME_TO_MESSAGE_TYPE = {
  // Images
  "image/jpeg":      "image",
  "image/png":       "image",
  "image/gif":       "image",
  "image/webp":      "image",
  "image/avif":      "image",
  // Videos
  "video/mp4":       "video",
  "video/webm":      "video",
  "video/quicktime": "video",
  // Audio / Voice
  "audio/mpeg":      "audio",
  "audio/ogg":       "audio",
  "audio/webm":      "voice",  // MediaRecorder output → treated as voice
  "audio/wav":       "audio",
  "audio/mp4":       "audio",
  // Documents
  "application/pdf":                                                   "document",
  "application/msword":                                                "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
  "application/vnd.ms-excel":                                          "document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "document",
  "application/zip":                                                   "document",
  "text/plain":                                                        "document",
};

/** Max upload size per file (bytes).  Enforced via Content-Length in S3 policy. */
const MAX_SIZE_BYTES = {
  image:    10 * 1024 * 1024,  // 10 MB
  video:   100 * 1024 * 1024,  // 100 MB
  audio:    20 * 1024 * 1024,  // 20 MB
  voice:    20 * 1024 * 1024,  // 20 MB
  document: 50 * 1024 * 1024,  // 50 MB
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const buildObjectKey = (userId, mimetype) => {
  const ext     = mimeToExt(mimetype);
  const random  = crypto.randomBytes(16).toString("hex");
  const folder  = MIME_TO_MESSAGE_TYPE[mimetype] ?? "misc";
  return `uploads/${folder}/${userId}/${random}${ext}`;
};

const mimeToExt = (mimetype) => {
  const map = {
    "image/jpeg":      ".jpg",
    "image/png":       ".png",
    "image/gif":       ".gif",
    "image/webp":      ".webp",
    "image/avif":      ".avif",
    "video/mp4":       ".mp4",
    "video/webm":      ".webm",
    "video/quicktime": ".mov",
    "audio/mpeg":      ".mp3",
    "audio/ogg":       ".ogg",
    "audio/webm":      ".webm",
    "audio/wav":       ".wav",
    "audio/mp4":       ".m4a",
    "application/pdf": ".pdf",
    "text/plain":      ".txt",
  };
  return map[mimetype] ?? path.extname(mimetype.split("/")[1] ?? "") ?? "";
};

/**
 * Build the public URL for an object key.
 * Matches the logic in media.worker.js so URLs are consistent.
 */
export const buildMediaUrl = (key) => {
  if (process.env.S3_ENDPOINT) {
    return `${process.env.S3_ENDPOINT}/${S3_BUCKET}/${key}`;
  }
  // Use a CloudFront or custom domain if configured
  if (process.env.CDN_URL) {
    return `${process.env.CDN_URL}/${key}`;
  }
  return `https://${S3_BUCKET}.s3.${process.env.S3_REGION || "us-east-1"}.amazonaws.com/${key}`;
};

// ---------------------------------------------------------------------------
// 3.1 — Generate presigned PUT URL
// ---------------------------------------------------------------------------

/**
 * Returns a presigned S3 PUT URL the client should use to upload the file
 * directly to object storage (the file never touches the Node.js process).
 *
 * @param {{ mimetype: string, size: number, userId: string }} params
 * @returns {{ uploadUrl: string, key: string, mediaType: string, mediaUrl: string }}
 */
export const getPresignedUploadUrl = async ({ mimetype, size, userId }) => {
  // Guard: fail fast with a clear message when S3 / compatible storage is not configured
  if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY || !process.env.S3_BUCKET) {
    throw new ApiError(
      503,
      "Object storage is not configured on this server. " +
        "Set S3_BUCKET, S3_ACCESS_KEY and S3_SECRET_KEY (and optionally S3_ENDPOINT for MinIO/R2) in .env."
    );
  }

  const mediaType = MIME_TO_MESSAGE_TYPE[mimetype];
  if (!mediaType) {
    throw new ApiError(415, `Unsupported media type: ${mimetype}`);
  }

  const maxSize = MAX_SIZE_BYTES[mediaType];
  if (size > maxSize) {
    const mb = Math.round(maxSize / (1024 * 1024));
    throw new ApiError(413, `File too large. Maximum size for ${mediaType} is ${mb} MB`);
  }

  const key = buildObjectKey(userId, mimetype);

  const command = new PutObjectCommand({
    Bucket:        S3_BUCKET,
    Key:           key,
    ContentType:   mimetype,
    ContentLength: size,
    // Tag uploads so lifecycle policies can clean up abandoned files
    Tagging:       "status=pending",
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGN_EXPIRES_IN,
  });

  return {
    uploadUrl,
    key,
    mediaType,
    mediaUrl: buildMediaUrl(key),
    expiresIn: PRESIGN_EXPIRES_IN,
  };
};

// ---------------------------------------------------------------------------
// 3.1 — Confirm upload (client calls this after the PUT succeeds)
// ---------------------------------------------------------------------------

/**
 * Verify the object actually exists in S3 (prevents clients claiming
 * a mediaKey for a file they never actually uploaded).
 *
 * @param {string} key
 * @returns {{ exists: boolean, size: number, contentType: string }}
 */
export const confirmUploadService = async (key) => {
  try {
    const cmd    = new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key });
    const result = await s3Client.send(cmd);
    return {
      exists:      true,
      contentType: result.ContentType,
    };
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
      throw new ApiError(404, "Upload not found. Please upload the file first.");
    }
    throw err;
  }
};

// ---------------------------------------------------------------------------
// 3.1 — Delete a media object (used when a message is deleted-for-everyone)
// ---------------------------------------------------------------------------

export const deleteMediaObject = async (key) => {
  try {
    await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
  } catch (err) {
    // Silently log — stale S3 objects are cleaned up by lifecycle rules
    console.error("[S3] Delete failed for key:", key, err.message);
  }
};
