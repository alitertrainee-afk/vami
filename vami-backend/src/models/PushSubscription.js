// libs imports
import mongoose from "mongoose";

/**
 * Web Push subscription record.
 *
 * One user may have many devices/browsers.
 * Each subscription is uniquely identified by its `endpoint` URL.
 * Expired / revoked subscriptions are deleted on first send failure (410 Gone).
 */
const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    /** The push service endpoint URL provided by the browser. */
    endpoint: {
      type: String,
      required: true,
      unique: true,
    },

    /** VAPID / DH encryption keys returned by the browser's PushManager. */
    keys: {
      p256dh: { type: String, required: true },
      auth:   { type: String, required: true },
    },

    /** Free-form label so users know which device this is (e.g. "Chrome on Windows"). */
    deviceLabel: { type: String, default: "" },
  },
  { timestamps: true },
);

// All subscriptions for a user
pushSubscriptionSchema.index({ user: 1, createdAt: -1 });

const PushSubscription = mongoose.model("PushSubscription", pushSubscriptionSchema);
export default PushSubscription;
