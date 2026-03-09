// local utilities
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/responseHandler.js";

// local services
import {
  createStatusService,
  getStatusFeedService,
  getMyStatusesService,
  viewStatusService,
  getStatusViewersService,
  deleteStatusService,
} from "../services/status.service.js";

/**
 * POST /api/v1/statuses
 * Create a new text, image, or video status.
 */
export const createStatus = asyncHandler(async (req, res) => {
  const status = await createStatusService({
    userId:        req.user._id,
    type:          req.body.type,
    content:       req.body.content,
    bgColor:       req.body.bgColor,
    fontIndex:     req.body.fontIndex,
    mediaKey:      req.body.mediaKey,
    mediaUrl:      req.body.mediaUrl,
    mediaMimeType: req.body.mediaMimeType,
    thumbnailKey:  req.body.thumbnailKey,
    thumbnailUrl:  req.body.thumbnailUrl,
    caption:       req.body.caption,
    privacy:       req.body.privacy,
    privacyList:   req.body.privacyList,
  });
  return sendResponse(res, 201, "Status created", status);
});

/**
 * GET /api/v1/statuses/feed
 * Fetch all non-expired statuses from the user's contacts.
 */
export const getStatusFeed = asyncHandler(async (req, res) => {
  const statuses = await getStatusFeedService(req.user._id);
  return sendResponse(res, 200, "Status feed fetched", statuses);
});

/**
 * GET /api/v1/statuses/me
 * Fetch the authenticated user's own statuses.
 */
export const getMyStatuses = asyncHandler(async (req, res) => {
  const statuses = await getMyStatusesService(req.user._id);
  return sendResponse(res, 200, "My statuses fetched", statuses);
});

/**
 * POST /api/v1/statuses/:statusId/view
 * Record a view and notify the status owner.
 */
export const viewStatus = asyncHandler(async (req, res) => {
  const result = await viewStatusService({
    statusId: req.params.statusId,
    viewerId: req.user._id,
  });
  return sendResponse(res, 200, "Status viewed", result);
});

/**
 * GET /api/v1/statuses/:statusId/viewers
 * Return the full viewer list (status owner only).
 */
export const getStatusViewers = asyncHandler(async (req, res) => {
  const result = await getStatusViewersService({
    statusId: req.params.statusId,
    userId:   req.user._id,
  });
  return sendResponse(res, 200, "Viewers fetched", result);
});

/**
 * DELETE /api/v1/statuses/:statusId
 * Delete a status (owner only).
 */
export const deleteStatus = asyncHandler(async (req, res) => {
  const result = await deleteStatusService({
    statusId: req.params.statusId,
    userId:   req.user._id,
  });
  return sendResponse(res, 200, result.message);
});
