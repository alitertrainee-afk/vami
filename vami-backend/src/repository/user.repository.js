import User from "../models/User.js";

/**
 * Search users by keyword (username/email), excluding the current user.
 * Uses MongoDB text index if available, falls back to regex.
 * @param {Object} params
 * @param {string} params.keyword - Search term
 * @param {string} params.excludeUserId - User ID to exclude
 * @param {number} [params.limit=10] - Max results
 * @returns {Promise<Array>} Matching user documents
 */
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

/**
 * Find a user by email or username.
 * @param {Object} params
 * @param {string} [params.email] - Email to search
 * @param {string} [params.username] - Username to search
 * @param {string} [select] - Mongoose select string (e.g., "+password")
 * @returns {Promise<Object|null>} User document or null
 */
export const findUserByEmailOrUsername = async ({ email, username }, select) => {
  const query = User.findOne({
    $or: [{ email }, { username }],
  });

  if (select) query.select(select);

  return query;
};

/**
 * Create a new user document.
 * @param {Object} payload - User data (username, email, password)
 * @returns {Promise<Object>} Created user document
 */
export const createUser = async (payload) => {
  return User.create(payload);
};

/**
 * Find a user by ID.
 * @param {string} id - User's MongoDB ID
 * @param {string} [select="-password"] - Field selection
 * @returns {Promise<Object|null>} User document or null
 */
export const findUserById = async (id, select = "-password") => {
  return User.findById(id).select(select);
};

/**
 * Update a user's online/offline status and last seen time.
 * @param {Object} params
 * @param {string} params.userId - User ID to update
 * @param {boolean} params.isOnline - New presence state
 * @returns {Promise<Object>} Updated user document
 */
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
