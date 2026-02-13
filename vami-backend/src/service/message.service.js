// local imports
import { ApiError } from "../utils/ApiError.js";
import {
  findMessagesByConversationId,
  createMessage,
  updateLatestMessage,
} from "../repositories/message.repository.js";

export const getAllMessagesService = async (chatId) => {
  if (!chatId) {
    throw new ApiError(400, "ChatId is required");
  }

  return findMessagesByConversationId(chatId);
};

export const sendMessageService = async ({ senderId, chatId, content }) => {
  if (!chatId || !content) {
    throw new ApiError(400, "Invalid data passed into request");
  }

  const message = await createMessage({
    senderId,
    chatId,
    content,
  });

  await updateLatestMessage(chatId, message);

  return message;
};

export const updateUserPresenceService = async ({ userId, isOnline }) => {
  if (!userId) {
    throw new ApiError(400, "UserId is required");
  }

  return updateUserPresence({ userId, isOnline });
};
