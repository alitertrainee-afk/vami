// local models
import PushSubscription from "../models/PushSubscription.js";

// -----------------------------------------------------------------------
// Subscriptions
// -----------------------------------------------------------------------

/** Upsert a push subscription (keyed on endpoint). */
export const upsertPushSubscription = async (userId, subscription, deviceLabel = "") => {
  return PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      user: userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      deviceLabel,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
};

/** Remove a push subscription by endpoint. */
export const deletePushSubscription = async (endpoint) => {
  return PushSubscription.findOneAndDelete({ endpoint });
};

/** Remove a stale / revoked subscription (called on 410 Gone response). */
export const deleteStaleSubscription = async (endpoint) => {
  return PushSubscription.findOneAndDelete({ endpoint });
};

/** Retrieve all active subscriptions for a user. */
export const findSubscriptionsByUser = async (userId) => {
  return PushSubscription.find({ user: userId }).lean();
};

/** Retrieve all active subscriptions for an array of user IDs. */
export const findSubscriptionsByUsers = async (userIds) => {
  return PushSubscription.find({ user: { $in: userIds } }).lean();
};
