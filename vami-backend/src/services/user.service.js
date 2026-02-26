// local utilities
import { ApiError } from "../utils/ApiError.js";

// local repository
import {
  searchUsers,
  updateUserPresence,
  findUserById,
  findUserByEmailOrUsername,
  updateUserProfile,
} from "../repository/user.repository.js";

export const searchUsersService = async ({ search, currentUserId }) => {
  if (!currentUserId) {
    throw new ApiError(401, "Unauthorized");
  }

  const keyword = search?.trim();

  return searchUsers({
    keyword,
    excludeUserId: currentUserId,
    limit: 10,
  });
};

export const updateUserPresenceService = async ({ userId, isOnline }) => {
  if (!userId) {
    throw new ApiError(400, "UserId is required");
  }

  return updateUserPresence({ userId, isOnline });
};

export const getProfileService = async (userId) => {
  const user = await findUserById(userId);
  if (!user) throw new ApiError(404, "User not found");
  return user;
};

export const updateProfileService = async (userId, data) => {
  // Build a flat update object from the validated body
  const updates = {};

  if (data.username !== undefined) updates.username = data.username;
  if (data.email !== undefined) updates.email = data.email;
  if (data.bio !== undefined) updates["profile.bio"] = data.bio;
  if (data.avatar !== undefined) updates["profile.avatar"] = data.avatar;
  if (data.theme !== undefined) updates["preferences.theme"] = data.theme;
  if (data.notifications !== undefined)
    updates["preferences.notifications"] = data.notifications;

  if (Object.keys(updates).length === 0) {
    throw new ApiError(400, "No fields to update");
  }

  // Check unique constraints if username or email are being changed
  if (data.username || data.email) {
    const existing = await findUserByEmailOrUsername({
      email: data.email,
      username: data.username,
    });

    if (existing && existing._id.toString() !== userId.toString()) {
      throw new ApiError(409, "Username or email already taken");
    }
  }

  return updateUserProfile(userId, { $set: updates });
};

export const changePasswordService = async (
  userId,
  currentPassword,
  newPassword,
) => {
  const user = await findUserById(userId, "+password");
  if (!user) throw new ApiError(404, "User not found");

  const isMatch = await user.isPasswordCorrect(currentPassword);
  if (!isMatch) throw new ApiError(400, "Current password is incorrect");

  user.password = newPassword;
  await user.save();

  return { message: "Password changed successfully" };
};
