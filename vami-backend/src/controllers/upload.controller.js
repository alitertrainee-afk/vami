// local utilities
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/responseHandler.js";

// local services
import { getPresignedUploadUrl, confirmUploadService } from "../services/upload.service.js";

// ---------------------------------------------------------------------------
// POST /api/v1/uploads/presign
// ---------------------------------------------------------------------------

/**
 * Request a presigned S3 PUT URL.
 *
 * Body: { mimetype: string, size: number (bytes) }
 * Response: { uploadUrl, key, mediaType, mediaUrl, expiresIn }
 *
 * Flow:
 *  1. Client calls this endpoint to get a one-time PUT URL.
 *  2. Client PUTs the file directly to S3 using uploadUrl.
 *  3. Client calls POST /api/v1/uploads/confirm with the returned key.
 *  4. Client sends a message via REST or socket, including mediaKey + mediaUrl.
 */
export const requestPresignedUrl = asyncHandler(async (req, res) => {
  const { mimetype, size } = req.body;

  const result = await getPresignedUploadUrl({
    mimetype,
    size,
    userId: req.user._id.toString(),
  });

  return sendResponse(res, 200, "Presigned URL generated", result);
});

// ---------------------------------------------------------------------------
// POST /api/v1/uploads/confirm
// ---------------------------------------------------------------------------

/**
 * Confirm the client successfully uploaded a file to S3.
 * Returns the verified content-type so the client can populate message metadata.
 *
 * Body: { key: string }
 */
export const confirmUpload = asyncHandler(async (req, res) => {
  const { key } = req.body;
  const result  = await confirmUploadService(key);
  return sendResponse(res, 200, "Upload confirmed", result);
});
