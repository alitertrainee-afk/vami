// local utilities
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/responseHandler.js";

// local services
import {
  searchUsersService,
  getProfileService,
  updateProfileService,
  changePasswordService,
} from "../services/user.service.js";

export const searchUsers = asyncHandler(async (req, res) => {
  const users = await searchUsersService({
    search: req.query.search,
    currentUserId: req.user?._id,
  });

  return sendResponse(res, 200, "Users fetched successfully", users);
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await getProfileService(req.user._id);
  return sendResponse(res, 200, "Profile fetched successfully", user);
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await updateProfileService(req.user._id, req.body);
  return sendResponse(res, 200, "Profile updated successfully", user);
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await changePasswordService(
    req.user._id,
    currentPassword,
    newPassword,
  );
  return sendResponse(res, 200, result.message);
});
