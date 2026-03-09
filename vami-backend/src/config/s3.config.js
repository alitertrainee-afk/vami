// libs imports
import { S3Client } from "@aws-sdk/client-s3";

/**
 * S3-compatible client.
 *
 * Works with AWS S3, Cloudflare R2, MinIO, Backblaze B2 — anything that
 * speaks the S3 API.  Set the following environment variables:
 *
 *   S3_REGION        — AWS region (e.g. "us-east-1") or "auto" for R2
 *   S3_ENDPOINT      — Custom endpoint URL.  Required for R2/MinIO; omit
 *                       for real AWS S3.
 *   S3_ACCESS_KEY    — Access key ID
 *   S3_SECRET_KEY    — Secret access key
 *   S3_BUCKET        — Default bucket name
 *
 * Development (without a real cloud bucket):
 *   Run MinIO locally:
 *     docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ":9001"
 *   Then set:
 *     S3_ENDPOINT=http://localhost:9000
 *     S3_REGION=us-east-1
 *     S3_ACCESS_KEY=minioadmin
 *     S3_SECRET_KEY=minioadmin
 *     S3_BUCKET=vami-media
 */
const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
  credentials: {
    accessKeyId:     process.env.S3_ACCESS_KEY     || "",
    secretAccessKey: process.env.S3_SECRET_KEY     || "",
  },
  // Required for path-style URLs with MinIO / local dev
  forcePathStyle: !!process.env.S3_ENDPOINT,
});

export const S3_BUCKET = process.env.S3_BUCKET || "vami-media";

export default s3Client;
