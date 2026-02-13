// local imports
import { updateUserPresence } from "../repository/user.repository.js";
import { ApiError } from "../utils/ApiError.js";

export const updateUserPresenceService = async ({ userId, isOnline }) => {
  if (!userId) {
    throw new ApiError(400, "UserId is required");
  }

  return updateUserPresence({ userId, isOnline });
};
