import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { createParticipants, addParticipant, removeParticipant } from "./participant.repository.js";

/**
 * Find an existing 1-on-1 chat between two users.
 * @param {string} userId - First user's ID
 * @param {string} otherUserId - Second user's ID
 * @returns {Promise<Array>} Array of matching chats (0 or 1)
 */
export const findOneOnOneChat = async (userId, otherUserId) => {
  const chats = await Conversation.find({
    isGroupChat: false,
    participants: { $all: [userId, otherUserId] },
  })
    .populate("participants", "username email profile.avatar isOnline")
    .populate({
      path: "latestMessage",
      populate: { path: "sender", select: "username profile.avatar" },
    });

  return chats;
};

/**
 * Create a new 1-on-1 chat and its participant records.
 * @param {string} userId - Creator's ID
 * @param {string} otherUserId - Other participant's ID
 * @returns {Promise<Object>} Populated chat document
 */
export const createOneOnOneChat = async (userId, otherUserId) => {
  const chat = await Conversation.create({
    isGroupChat: false,
    participants: [userId, otherUserId],
  });

  await createParticipants(chat._id, [userId, otherUserId]);

  return Conversation.findById(chat._id)
    .populate("participants", "username email profile.avatar isOnline");
};

/**
 * Get all conversations for a user, sorted by most recently updated.
 * Uses a single nested populate for latestMessage.sender instead of
 * a separate User.populate round-trip.
 * @param {string} userId - User's ID
 * @returns {Promise<Array>} Array of conversation documents
 */
export const findUserChats = async (userId) => {
  return Conversation.find({
    participants: userId,
  })
    .populate("participants", "username email profile.avatar isOnline")
    .populate("groupAdmin", "username email profile.avatar")
    .populate({
      path: "latestMessage",
      populate: { path: "sender", select: "username profile.avatar" },
    })
    .sort({ updatedAt: -1 })
    .lean();
};

/**
 * Find a conversation by ID (without population).
 * @param {string} chatId - Conversation ID
 * @returns {Promise<Object|null>} Raw conversation document
 */
export const findConversationById = async (chatId) => {
  return Conversation.findById(chatId);
};

/**
 * Create a new group chat with the given name, participants, and admin.
 * @param {Object} params
 * @param {string} params.chatName - Group name
 * @param {Array<string>} params.participants - Array of user IDs
 * @param {string} params.adminId - Admin user ID
 * @returns {Promise<Object>} Populated group chat document
 */
export const createGroupChat = async ({ chatName, participants, adminId }) => {
  const chat = await Conversation.create({
    chatName,
    isGroupChat: true,
    participants,
    groupAdmin: adminId,
  });

  await createParticipants(chat._id, participants);

  return Conversation.findById(chat._id)
    .populate("participants", "username email profile.avatar isOnline")
    .populate("groupAdmin", "username email profile.avatar");
};

/**
 * Add a member to a group chat.
 * @param {string} chatId - Conversation ID
 * @param {string} userId - User ID to add
 * @returns {Promise<Object>} Updated group chat document
 */
export const addMemberToGroup = async (chatId, userId) => {
  await addParticipant(chatId, userId);

  return Conversation.findByIdAndUpdate(
    chatId,
    { $addToSet: { participants: userId } },
    { new: true },
  )
    .populate("participants", "username email profile.avatar isOnline")
    .populate("groupAdmin", "username email profile.avatar");
};

/**
 * Remove a member from a group chat.
 * @param {string} chatId - Conversation ID
 * @param {string} userId - User ID to remove
 * @returns {Promise<Object>} Updated group chat document
 */
export const removeMemberFromGroup = async (chatId, userId) => {
  await removeParticipant(chatId, userId);

  return Conversation.findByIdAndUpdate(
    chatId,
    { $pull: { participants: userId } },
    { new: true },
  )
    .populate("participants", "username email profile.avatar isOnline")
    .populate("groupAdmin", "username email profile.avatar");
};

/**
 * Rename a group chat.
 * @param {string} chatId - Conversation ID
 * @param {string} chatName - New group name
 * @returns {Promise<Object>} Updated group chat document
 */
export const renameGroupChat = async (chatId, chatName) => {
  return Conversation.findByIdAndUpdate(
    chatId,
    { chatName },
    { new: true },
  )
    .populate("participants", "username email profile.avatar isOnline")
    .populate("groupAdmin", "username email profile.avatar");
};
