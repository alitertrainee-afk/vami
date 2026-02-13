import User from "../models/User.js";

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
