// local imports
import { ApiError } from "../utils/ApiError.js";
import {
  findMessages,
  countMessages,
  insertMessage,
  updateConversationLatestMessage,
} from "../repository/message.repository.js";

export const getAllMessagesService = async (chatId, query) => {
  if (!chatId) {
    throw new ApiError(400, "ChatId is required");
  }

  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Number(query.limit) || 20, 100);
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    findMessages({
      chatId,
      skip,
      limit,
      sort: { createdAt: -1 },
    }),
    countMessages(chatId),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    messages: messages.reverse(), // chronological order
    pagination: {
      total,
      totalPages,
      currentPage: page,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};

export const sendMessageService = async ({ senderId, chatId, content }) => {
  if (!chatId || !content) {
    throw new ApiError(400, "Invalid data passed into request");
  }

  const message = await insertMessage({
    senderId,
    chatId,
    content,
  });

  await updateConversationLatestMessage(chatId, message._id);

  return message;
};
