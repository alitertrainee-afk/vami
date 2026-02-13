import User from "../models/User.js";

/**
 * Search users by keyword (username/email),
 * excluding the current user
 */
export const searchUsers = async ({ keyword, excludeUserId, limit = 10 }) => {
  const query = keyword
    ? {
        $or: [
          { username: { $regex: keyword, $options: "i" } },
          { email: { $regex: keyword, $options: "i" } },
        ],
      }
    : {};
  console.log("🚀 ~ searchUsers ~ query:", query)

  return await User.find(query)
    .find({ _id: { $ne: excludeUserId } })
    .select("username email profile.avatar isOnline")
    .limit(limit);
};

/* existing exports stay untouched */
export const findUserByEmailOrUsername = async ({ email, username }) => {
  return User.findOne({
    $or: [{ email }, { username }],
  });
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
