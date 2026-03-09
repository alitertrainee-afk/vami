/**
 * Web Push Notification Service (VAPID)
 *
 * VAPID key generation (run ONCE, store in .env):
 *   node -e "const wp = require('web-push'); const k = wp.generateVAPIDKeys(); console.log(k);"
 *
 * Required env vars:
 *   VAPID_PUBLIC_KEY    — base64url ECDH public key
 *   VAPID_PRIVATE_KEY   — base64url ECDH private key
 *   VAPID_SUBJECT       — mailto: or https: contact URL
 */

// libs imports
import webpush from "web-push";

// local utilities
import { ApiError } from "../utils/ApiError.js";

// local repository
import {
  upsertPushSubscription,
  deletePushSubscription,
  findSubscriptionsByUser,
  findSubscriptionsByUsers,
  deleteStaleSubscription,
} from "../repository/push.repository.js";

// -----------------------------------------------------------------------
// Initialise VAPID credentials once on first import
// -----------------------------------------------------------------------
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT || "mailto:admin@vami.app",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
} else {
  console.warn("[push] VAPID keys not set — web push notifications disabled");
}

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

/** Return the VAPID public key so the frontend can call PushManager.subscribe(). */
export const getVapidPublicKeyService = () => {
  if (!VAPID_PUBLIC_KEY) {
    throw new ApiError(503, "Push notifications are not configured on this server");
  }
  return { publicKey: VAPID_PUBLIC_KEY };
};

/** Save (or refresh) a push subscription for the authenticated user. */
export const subscribePushService = async ({ userId, subscription, deviceLabel }) => {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    throw new ApiError(400, "Invalid push subscription object");
  }
  return upsertPushSubscription(userId, subscription, deviceLabel);
};

/** Remove a push subscription (user unsubscribed or logged out on device). */
export const unsubscribePushService = async ({ userId, endpoint }) => {
  if (!endpoint) throw new ApiError(400, "endpoint is required");
  return deletePushSubscription(endpoint);
};

/** Retrieve all push subscriptions for the current user (for device management). */
export const listSubscriptionsService = async (userId) => {
  return findSubscriptionsByUser(userId);
};

// -----------------------------------------------------------------------
// Internal — used by other services
// -----------------------------------------------------------------------

/**
 * Send a web push notification to all registered devices of one or more users.
 *
 * Silently drops disabled / invalid subscriptions.
 * Removes stale subscriptions (410 Gone) automatically.
 *
 * @param {string|string[]} userIds  - recipient user IDs
 * @param {object}          payload  - { title, body, icon?, badge?, data? }
 */
export const sendPushToUsers = async (userIds, payload) => {
  if (!VAPID_PUBLIC_KEY) return; // Push not configured

  const ids = Array.isArray(userIds) ? userIds : [userIds];
  if (ids.length === 0) return;

  const subscriptions = await findSubscriptionsByUsers(ids);
  if (subscriptions.length === 0) return;

  const notification = JSON.stringify({
    title: payload.title ?? "Vami",
    body:  payload.body  ?? "",
    icon:  payload.icon  ?? "/icons/icon-192.png",
    badge: payload.badge ?? "/icons/badge-72.png",
    data:  payload.data  ?? {},
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          notification,
        );
      } catch (err) {
        // 410 Gone / 404 Not Found → subscription is stale, remove it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await deleteStaleSubscription(sub.endpoint).catch(() => {});
        }
        // All other errors (e.g. 429, network) are swallowed silently
      }
    }),
  );
};
