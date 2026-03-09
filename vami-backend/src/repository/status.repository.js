// local models
import Status from "../models/Status.js";

// -----------------------------------------------------------------------
// Create
// -----------------------------------------------------------------------

export const createStatus = async (payload) => {
  return Status.create(payload);
};

// -----------------------------------------------------------------------
// Read
// -----------------------------------------------------------------------

/**
 * Fetch all non-expired statuses created by a list of user IDs.
 * Used to build the "status feed" — caller filters by privacy.
 */
export const findStatusesByUsers = async (userIds) => {
  return Status.find({
    user:      { $in: userIds },
    expiresAt: { $gt: new Date() },
  })
    .populate("user", "username profile.avatar")
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * All statuses owned by a single user (for "My status" view + management).
 */
export const findMyStatuses = async (userId) => {
  return Status.find({ user: userId, expiresAt: { $gt: new Date() } })
    .sort({ createdAt: -1 })
    .lean();
};

export const findStatusById = async (statusId) => {
  return Status.findById(statusId).populate("user", "username profile.avatar");
};

// -----------------------------------------------------------------------
// View tracking
// -----------------------------------------------------------------------

/**
 * Add a view entry for `viewerId` (idempotent — won't double-count).
 * Returns the updated view count.
 */
export const addStatusView = async (statusId, viewerId) => {
  const updated = await Status.findOneAndUpdate(
    {
      _id: statusId,
      "views.viewer": { $ne: viewerId },
    },
    {
      $push: { views: { viewer: viewerId, viewedAt: new Date() } },
    },
    { new: true },
  );
  return updated?.views?.length ?? null;
};

/**
 * Fetch the list of viewers for a status (owner only).
 */
export const findStatusViewers = async (statusId) => {
  return Status.findById(statusId)
    .select("views")
    .populate("views.viewer", "username profile.avatar")
    .lean();
};

// -----------------------------------------------------------------------
// Delete
// -----------------------------------------------------------------------

export const deleteStatusById = async (statusId, userId) => {
  return Status.findOneAndDelete({ _id: statusId, user: userId });
};
