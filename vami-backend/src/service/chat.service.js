// local imports
import { ApiError } from "../utils/ApiError.js";
import {
  findOneOnOneChat,
  createOneOnOneChat,
  findUserChats,
} from "../repositories/conversation.repository.js";

export const accessChatService = async ({ userId, currentUserId }) => {
  if (!userId) {
    throw new ApiError(400, "UserId param not sent with request");
  }

  const existingChat = await findOneOnOneChat(currentUserId, userId);

  if (existingChat.length > 0) {
    return existingChat[0];
  }

  return createOneOnOneChat(currentUserId, userId);
};

export const fetchChatsService = async (currentUserId) => {
  return findUserChats(currentUserId);
};
