// local utilities
import { ApiError } from "../utils/ApiError.js";

// real-time events
import { emitToUser } from "../utils/socketEmitter.js";

// local repository
import {
  createStatus,
  findStatusesByUsers,
  findMyStatuses,
  findStatusById,
  addStatusView,
  findStatusViewers,
  deleteStatusById,
} from "../repository/status.repository.js";

// local models
import Conversation from "../models/Conversation.js";

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------

/**
 * Collect unique contact IDs for a user across all their conversations.
 * Used to determine who can see their status updates.
 */
const getContactIds = async (userId) => {
  const conversations = await Conversation.find(
    { participants: userId },
    { participants: 1 },
  ).lean();

  const ids = new Set();
  for (const conv of conversations) {
    for (const p of conv.participants) {
      if (p.toString() !== userId.toString()) {
        ids.add(p.toString());
      }
    }
  }
  return [...ids];
};

/**
 * Determine whether `viewerId` is allowed to see a status based on privacy settings.
 */
const isAllowedToView = (status, viewerId) => {
  const vid = viewerId.toString();
  const list = (status.privacyList || []).map((id) => id.toString());

  switch (status.privacy) {
    case "contacts":
      return true; // Already filtered by contact query
    case "contacts_except":
      return !list.includes(vid);
    case "only_share":
      return list.includes(vid) || status.user._id?.toString() === vid;
    default:
      return true;
  }
};

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

/** Create a new status for the authenticated user. */
export const createStatusService = async ({
  userId,
  type,
  content,
  bgColor,
  fontIndex,
  mediaKey,
  mediaUrl,
  mediaMimeType,
  thumbnailKey,
  thumbnailUrl,
  caption,
  privacy,
  privacyList,
}) => {
  if (type === "text" && !content?.trim()) {
    throw new ApiError(400, "Text status requires content");
  }
  if ((type === "image" || type === "video") && !mediaKey) {
    throw new ApiError(400, "Media status requires a mediaKey");
  }

  const status = await createStatus({
    user: userId,
    type,
    content,
    bgColor,
    fontIndex,
    mediaKey,
    mediaUrl,
    mediaMimeType,
    thumbnailKey,
    thumbnailUrl,
    caption,
    privacy: privacy || "contacts",
    privacyList: privacyList || [],
  });

  // Notify contacts so they can update their status feed in real-time
  const contactIds = await getContactIds(userId);
  for (const contactId of contactIds) {
    emitToUser(contactId, "contact_status_updated", {
      userId,
      statusId: status._id,
    });
  }

  return status;
};

/** Fetch all non-expired statuses from the user's contacts. */
export const getStatusFeedService = async (userId) => {
  const contactIds = await getContactIds(userId);
  if (contactIds.length === 0) return [];

  const statuses = await findStatusesByUsers(contactIds);

  // Apply per-status privacy filtering
  return statuses.filter((s) => isAllowedToView(s, userId));
};

/** Fetch the authenticated user's own statuses. */
export const getMyStatusesService = async (userId) => {
  return findMyStatuses(userId);
};

/**
 * View a status — record the view, return view count.
 * Validates that the viewer is a contact of the status owner.
 */
export const viewStatusService = async ({ statusId, viewerId }) => {
  const status = await findStatusById(statusId);
  if (!status) throw new ApiError(404, "Status not found or has expired");

  // Owner viewing their own status is fine (just returns count)
  if (status.user._id.toString() !== viewerId.toString()) {
    if (!isAllowedToView(status, viewerId)) {
      throw new ApiError(403, "You do not have permission to view this status");
    }
  }

  const viewCount = await addStatusView(statusId, viewerId);

  // Notify the owner in real-time that someone viewed their status
  emitToUser(status.user._id, "status_viewed", {
    statusId,
    viewerId,
    viewCount,
  });

  return { viewCount };
};

/** Return the full viewer list for a status (owner only). */
export const getStatusViewersService = async ({ statusId, userId }) => {
  const status = await findStatusById(statusId);
  if (!status) throw new ApiError(404, "Status not found");

  if (status.user._id.toString() !== userId.toString()) {
    throw new ApiError(403, "Only the status owner can see viewer details");
  }

  return findStatusViewers(statusId);
};

/** Delete a status (owner only). */
export const deleteStatusService = async ({ statusId, userId }) => {
  const deleted = await deleteStatusById(statusId, userId);
  if (!deleted) throw new ApiError(404, "Status not found or already deleted");

  // Notify contacts to remove it from their feed
  const contactIds = await getContactIds(userId);
  for (const contactId of contactIds) {
    emitToUser(contactId, "contact_status_deleted", { statusId, userId });
  }

  return { message: "Status deleted" };
};
