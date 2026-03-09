// local models
import Conversation from "../models/Conversation.js";

// local repositories
import { createParticipants, addParticipant, removeParticipant } from "./participant.repository.js";

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

export const createOneOnOneChat = async (userId, otherUserId) => {
  const session = await Conversation.startSession();
  session.startTransaction();

  try {
    const [chat] = await Conversation.create(
      [{ isGroupChat: false, participants: [userId, otherUserId] }],
      { session },
    );

    await createParticipants(chat._id, [userId, otherUserId], session);

    await session.commitTransaction();

    return Conversation.findById(chat._id)
      .populate("participants", "username email profile.avatar isOnline");
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

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

export const findConversationById = async (chatId) => {
  return Conversation.findById(chatId);
};

export const createGroupChat = async ({ chatName, participants, adminId }) => {
  const chat = await Conversation.create({
    chatName,
    isGroupChat: true,
    participants,
    groupAdmin: adminId,
    admins: [adminId],
  });

  await createParticipants(chat._id, participants);

  return Conversation.findById(chat._id)
    .populate("participants", "username email profile.avatar isOnline")
    .populate("groupAdmin", "username email profile.avatar");
};

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

export const renameGroupChat = async (chatId, chatName) => {
  return Conversation.findByIdAndUpdate(
    chatId,
    { chatName },
    { new: true },
  )
    .populate("participants", "username email profile.avatar isOnline")
    .populate("groupAdmin", "username email profile.avatar");
};

// -----------------------------------------------------------------------
// Phase 4 — Multi-admin, group info, invite links
// -----------------------------------------------------------------------

const GROUP_POPULATE = [
  { path: "participants", select: "username email profile.avatar isOnline" },
  { path: "groupAdmin",   select: "username email profile.avatar" },
  { path: "admins",       select: "username email profile.avatar" },
];

/** Update group metadata (name, description, groupAvatar). */
export const updateGroupInfo = async (chatId, updates) => {
  return Conversation.findByIdAndUpdate(chatId, { $set: updates }, { new: true })
    .populate(GROUP_POPULATE);
};

/** Add a user to the admins array. */
export const promoteToAdmin = async (chatId, userId) => {
  return Conversation.findByIdAndUpdate(
    chatId,
    { $addToSet: { admins: userId } },
    { new: true },
  ).populate(GROUP_POPULATE);
};

/** Remove a user from the admins array. */
export const demoteFromAdmin = async (chatId, userId) => {
  return Conversation.findByIdAndUpdate(
    chatId,
    { $pull: { admins: userId } },
    { new: true },
  ).populate(GROUP_POPULATE);
};

/** Pull a user from both participants and admins arrays. */
export const leaveGroupConversation = async (chatId, userId) => {
  return Conversation.findByIdAndUpdate(
    chatId,
    { $pull: { participants: userId, admins: userId } },
    { new: true },
  ).populate(GROUP_POPULATE);
};

/** Set (or clear) the invite token for a group. */
export const setInviteToken = async (chatId, token) => {
  return Conversation.findByIdAndUpdate(
    chatId,
    { inviteToken: token },
    { new: true },
  );
};

/** Find a conversation by its invite token. */
export const findByInviteToken = async (token) => {
  return Conversation.findOne({ inviteToken: token }).populate(GROUP_POPULATE);
};

/** Update group-level messaging settings (e.g. onlyAdminsCanMessage). */
export const updateGroupSettings = async (chatId, settings) => {
  return Conversation.findByIdAndUpdate(chatId, { $set: settings }, { new: true })
    .populate(GROUP_POPULATE);
};

/** Auto-promote the oldest non-admin participant (used when last admin leaves). */
export const promoteOldestParticipant = async (chatId, excludeUserId) => {
  const chat = await Conversation.findById(chatId).lean();
  if (!chat) return null;

  const candidate = chat.participants.find(
    (p) => p.toString() !== excludeUserId.toString(),
  );
  if (!candidate) return null;

  return Conversation.findByIdAndUpdate(
    chatId,
    { $addToSet: { admins: candidate } },
    { new: true },
  );
};
