// local imports
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/responseHandler.js";
import {
  getAllMessagesService,
  sendMessageService,
} from "../services/message.service.js";

export const allMessages = asyncHandler(async (req, res) => {
  const data = await getAllMessagesService(req.params.chatId, req.query);

  return sendResponse(res, 200, "Messages fetched successfully", data);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const message = await sendMessageService({
    senderId: req.user._id,
    chatId: req.body.chatId,
    content: req.body.content,
  });

  return sendResponse(res, 201, "Message sent successfully", message);
});
