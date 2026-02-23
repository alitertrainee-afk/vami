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
  const chat = await Conversation.create({
    isGroupChat: false,
    participants: [userId, otherUserId],
  });

  await createParticipants(chat?._id, [userId, otherUserId]);

  return Conversation.findById(chat._id)
    .populate("participants", "username email profile.avatar isOnline");
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
