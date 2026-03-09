// libs imports
import express from "express";

// local controllers
import {
  createStatus,
  getStatusFeed,
  getMyStatuses,
  viewStatus,
  getStatusViewers,
  deleteStatus,
} from "../controllers/status.controller.js";

// local middleware
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

// local validators
import { createStatusSchema, statusIdParamSchema } from "../validators/status.validator.js";

const router = express.Router();

// All status routes require authentication
router.use(protect);

// Feed & own statuses
router.get("/feed", getStatusFeed);                                                     // GET  /api/v1/statuses/feed
router.get("/me",   getMyStatuses);                                                     // GET  /api/v1/statuses/me
router.post("/",    validate(createStatusSchema), createStatus);                        // POST /api/v1/statuses

// Per-status operations
router.post(  "/:statusId/view",    validate(statusIdParamSchema), viewStatus);         // POST /api/v1/statuses/:id/view
router.get(   "/:statusId/viewers", validate(statusIdParamSchema), getStatusViewers);   // GET  /api/v1/statuses/:id/viewers
router.delete("/:statusId",         validate(statusIdParamSchema), deleteStatus);       // DELETE /api/v1/statuses/:id

export default router;
