// local imports
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/responseHandler.js";
import {
  accessChatService,
  fetchChatsService,
} from "../service/chat.service.js";

export const accessChat = asyncHandler(async (req, res) => {
  const chat = await accessChatService({
    userId: req.body.userId,
    currentUserId: req.user._id,
  });

  return sendResponse(res, 200, "Chat fetched successfully", chat);
});

export const fetchChats = asyncHandler(async (req, res) => {
  const chats = await fetchChatsService(req.user._id);

  return sendResponse(res, 200, "Chats fetched successfully", chats);
});
