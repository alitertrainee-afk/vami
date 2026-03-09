// libs imports
import express from "express";

// local controllers
import { requestPresignedUrl, confirmUpload } from "../controllers/upload.controller.js";

// local middleware
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

// local validators
import { presignSchema, confirmUploadSchema } from "../validators/upload.validator.js";

const router = express.Router();

// All upload endpoints require authentication
router.use(protect);

/**
 * POST /api/v1/uploads/presign
 * Returns a presigned S3 PUT URL.  Client uploads directly to S3.
 */
router.post("/presign", validate(presignSchema), requestPresignedUrl);

/**
 * POST /api/v1/uploads/confirm
 * Confirm the file was successfully uploaded to S3.
 */
router.post("/confirm", validate(confirmUploadSchema), confirmUpload);

export default router;
