// local models
import User from "../models/User.js";

export const searchUsers = async ({ keyword, excludeUserId, limit = 10 }) => {
  if (!keyword) {
    return User.find({ _id: { $ne: excludeUserId } })
      .select("username email profile.avatar isOnline")
      .limit(limit);
  }

  // Use text index for efficient search
  return User.find({
    $and: [
      { _id: { $ne: excludeUserId } },
      {
        $or: [
          { username: { $regex: keyword, $options: "i" } },
          { email: { $regex: keyword, $options: "i" } },
        ],
      },
    ],
  })
    .select("username email profile.avatar isOnline")
    .limit(limit);
};

export const findUserByEmailOrUsername = async (
  { email, username },
  select,
) => {
  const query = User.findOne({
    $or: [{ email }, { username }],
  });

  if (select) query.select(select);

  return query;
};

export const createUser = async (payload) => {
  return User.create(payload);
};

export const findUserById = async (id, select = "-password") => {
  return User.findById(id).select(select);
};

export const updateUserPresence = async ({ userId, isOnline }) => {
  return User.findByIdAndUpdate(
    userId,
    {
      isOnline,
      lastSeen: new Date(),
    },
    { new: true },
  );
};

export const updateUserProfile = async (userId, updates) => {
  return User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  }).select("-password");
};

/** Mark the user's email as verified. */
export const verifyUserEmail = async (userId) => {
  return User.findByIdAndUpdate(
    userId,
    { emailVerified: true },
    { new: true },
  ).select("-password");
};

// -----------------------------------------------------------------------
// Phase 4 — Block / unblock
// -----------------------------------------------------------------------

/** Add targetId to userId's blockedUsers list. */
export const blockUser = async (userId, targetId) => {
  return User.findByIdAndUpdate(
    userId,
    { $addToSet: { blockedUsers: targetId } },
    { new: true },
  ).select("blockedUsers");
};

/** Remove targetId from userId's blockedUsers list. */
export const unblockUser = async (userId, targetId) => {
  return User.findByIdAndUpdate(
    userId,
    { $pull: { blockedUsers: targetId } },
    { new: true },
  ).select("blockedUsers");
};

/** Return the populated list of users blocked by userId. */
export const findBlockedUsers = async (userId) => {
  return User.findById(userId)
    .select("blockedUsers")
    .populate("blockedUsers", "username email profile.avatar");
};

/** Return true if targetId is in userId's blockedUsers list. */
export const isBlockedByUser = async (userId, targetId) => {
  const user = await User.findById(userId).select("blockedUsers").lean();
  return (
    user?.blockedUsers?.some((id) => id.toString() === targetId.toString()) ??
    false
  );
};
