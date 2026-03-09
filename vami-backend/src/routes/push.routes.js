// libs imports
import express from "express";

// local controllers
import {
  getVapidPublicKey,
  subscribe,
  unsubscribe,
  listSubscriptions,
} from "../controllers/push.controller.js";

// local middleware
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";

// local validators
import { subscribePushSchema, unsubscribePushSchema } from "../validators/push.validator.js";

const router = express.Router();

/**
 * GET  /api/v1/push/vapid-key      → public — no auth needed
 * POST /api/v1/push/subscribe      → authenticated
 * DELETE /api/v1/push/subscribe    → authenticated
 * GET  /api/v1/push/subscriptions  → authenticated
 */
router.get("/vapid-key", getVapidPublicKey);

router.use(protect);

router.post("/subscribe",     validate(subscribePushSchema),   subscribe);
router.delete("/subscribe",   validate(unsubscribePushSchema), unsubscribe);
router.get("/subscriptions",  listSubscriptions);

export default router;
