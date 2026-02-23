import Conversation from "../models/Conversation.js";
import User from "../models/User.js";
import { createParticipants, addParticipant, removeParticipant } from "./participant.repository.js";

export const findOneOnOneChat = async (userId, otherUserId) => {
  const chats = await Conversation.find({
    isGroupChat: false,
    participants: { $all: [userId, otherUserId] },
  })
    .populate("participants", "-password")
    .populate("latestMessage");

  return User.populate(chats, {
    path: "latestMessage.sender",
    select: "username profile.avatar email",
  });
};

export const createOneOnOneChat = async (userId, otherUserId) => {
  const chat = await Conversation.create({
    isGroupChat: false,
    participants: [userId, otherUserId],
  });

  // Create per-user metadata records
  await createParticipants(chat._id, [userId, otherUserId]);

  return Conversation.findById(chat._id).populate("participants", "-password");
};

export const findUserChats = async (userId) => {
  const chats = await Conversation.find({
    participants: { $elemMatch: { $eq: userId } },
  })
    .populate("participants", "-password")
    .populate("groupAdmin", "-password")
    .populate("latestMessage")
    .sort({ updatedAt: -1 });

  return User.populate(chats, {
    path: "latestMessage.sender",
    select: "username profile.avatar email",
  });
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
    .populate("participants", "-password")
    .populate("groupAdmin", "-password");
};

export const addMemberToGroup = async (chatId, userId) => {
  await addParticipant(chatId, userId);

  return Conversation.findByIdAndUpdate(
    chatId,
    { $addToSet: { participants: userId } },
    { new: true },
  )
    .populate("participants", "-password")
    .populate("groupAdmin", "-password");
};

export const removeMemberFromGroup = async (chatId, userId) => {
  await removeParticipant(chatId, userId);

  return Conversation.findByIdAndUpdate(
    chatId,
    { $pull: { participants: userId } },
    { new: true },
  )
    .populate("participants", "-password")
    .populate("groupAdmin", "-password");
};

export const renameGroupChat = async (chatId, chatName) => {
  return Conversation.findByIdAndUpdate(
    chatId,
    { chatName },
    { new: true },
  )
    .populate("participants", "-password")
    .populate("groupAdmin", "-password");
};
