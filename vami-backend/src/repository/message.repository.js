// local imports
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import User from "../models/User.js";

export const findMessagesByConversationId = async (chatId) => {
  return Message.find({ conversationId: chatId })
    .populate("sender", "username profile.avatar email")
    .populate("conversationId");
};

export const createMessage = async ({ senderId, chatId, content }) => {
  let message = await Message.create({
    sender: senderId,
    content,
    conversationId: chatId,
  });

  message = await message.populate("sender", "username profile.avatar");
  message = await message.populate("conversationId");

  message = await User.populate(message, {
    path: "conversationId.participants",
    select: "username profile.avatar email",
  });

  return message;
};

export const updateLatestMessage = async (chatId, message) => {
  return Conversation.findByIdAndUpdate(chatId, {
    latestMessage: message,
  });
};
