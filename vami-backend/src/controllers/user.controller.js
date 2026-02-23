// local utilities
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/responseHandler.js";

// local services
import { searchUsersService } from "../services/user.service.js";

export const searchUsers = asyncHandler(async (req, res) => {
  const users = await searchUsersService({
    search: req.query.search,
    currentUserId: req.user?._id,
  });

  return sendResponse(res, 200, "Users fetched successfully", users);
});
