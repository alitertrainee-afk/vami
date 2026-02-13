import Conversation from "../models/Conversation.js";
import User from "../models/User.js";

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
    chatName: "sender",
    isGroupChat: false,
    participants: [userId, otherUserId],
  });

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
