// local utilities
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/responseHandler.js";

// local services
import {
  getVapidPublicKeyService,
  subscribePushService,
  unsubscribePushService,
  listSubscriptionsService,
} from "../services/push.service.js";

/**
 * GET /api/v1/push/vapid-key
 * Returns the server's VAPID public key.
 * The frontend needs this to call PushManager.subscribe().
 */
export const getVapidPublicKey = asyncHandler(async (_req, res) => {
  const data = getVapidPublicKeyService();
  return sendResponse(res, 200, "VAPID public key", data);
});

/**
 * POST /api/v1/push/subscribe
 * Save a new push subscription for the authenticated user.
 */
export const subscribe = asyncHandler(async (req, res) => {
  const result = await subscribePushService({
    userId:       req.user._id,
    subscription: req.body.subscription,
    deviceLabel:  req.body.deviceLabel,
  });
  return sendResponse(res, 201, "Push subscription saved", result);
});

/**
 * DELETE /api/v1/push/subscribe
 * Remove a push subscription (user unsubscribed from this device).
 */
export const unsubscribe = asyncHandler(async (req, res) => {
  await unsubscribePushService({
    userId:   req.user._id,
    endpoint: req.body.endpoint,
  });
  return sendResponse(res, 200, "Push subscription removed");
});

/**
 * GET /api/v1/push/subscriptions
 * Return all push subscriptions for the current user (device management).
 */
export const listSubscriptions = asyncHandler(async (req, res) => {
  const data = await listSubscriptionsService(req.user._id);
  return sendResponse(res, 200, "Subscriptions fetched", data);
});
