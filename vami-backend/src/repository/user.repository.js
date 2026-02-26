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
