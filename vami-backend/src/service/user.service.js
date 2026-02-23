import { ApiError } from "../utils/ApiError.js";
import {
  searchUsers,
  updateUserPresence,
} from "../repository/user.repository.js";

export const searchUsersService = async ({ search, currentUserId }) => {
  if (!currentUserId) {
    throw new ApiError(401, "Unauthorized");
  }

  // Optional: normalize search input
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
