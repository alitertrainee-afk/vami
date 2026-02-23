// local models
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";

export const findMessages = async ({ chatId, skip, limit, sort }) => {
  return Message.find({ conversation: chatId })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate("sender", "username profile.avatar email")
    .populate("conversation");
};

export const countMessages = async (chatId) => {
  return Message.countDocuments({ conversation: chatId });
};

export const insertMessage = async ({ senderId, chatId, content }) => {
  const message = await Message.create({
    sender: senderId,
    content,
    conversation: chatId,
  });

  // Populate sender so the socket can emit a complete object
  return message.populate("sender", "username profile.avatar email");
};

export const updateConversationLatestMessage = async (chatId, messageId) => {
  return Conversation.findByIdAndUpdate(chatId, {
    latestMessage: messageId,
  });
};
