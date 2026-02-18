// local imports
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";

export const findMessages = async ({ chatId, skip, limit, sort }) => {
  return Message.find({ conversationId: chatId })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate("sender", "username profile.avatar email")
    .populate("conversationId");
};

export const countMessages = async (chatId) => {
  return Message.countDocuments({ conversationId: chatId });
};

export const insertMessage = async ({ senderId, chatId, content }) => {
  return Message.create({
    sender: senderId,
    content,
    conversationId: chatId,
  });
};

export const updateConversationLatestMessage = async (chatId, messageId) => {
  return Conversation.findByIdAndUpdate(chatId, {
    latestMessage: messageId,
  });
};
