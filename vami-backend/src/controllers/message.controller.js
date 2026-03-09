// local utilities
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/responseHandler.js";

// local services
import {
  getAllMessagesService,
  sendMessageService,
  reactToMessageService,
  editMessageService,
  deleteMessageService,
  starMessageService,
  unstarMessageService,
  getStarredMessagesService,
  setDisappearTimerService,
} from "../services/message.service.js";

// ---------------------------------------------------------------------------
// Existing
// ---------------------------------------------------------------------------

export const allMessages = asyncHandler(async (req, res) => {
  const data = await getAllMessagesService(req.params.chatId, req.query, req.user._id);
  return sendResponse(res, 200, "Messages fetched successfully", data);
});

export const sendMessage = asyncHandler(async (req, res) => {
  const { chatId, content, type, replyToId } = req.body;
  const message = await sendMessageService({
    senderId: req.user._id,
    chatId,
    content,
    type,
    replyToId,
  });
  return sendResponse(res, 201, "Message sent successfully", message);
});

// ---------------------------------------------------------------------------
// 2.3 — Reactions
// ---------------------------------------------------------------------------

export const reactToMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { emoji, chatId } = req.body;
  const message = await reactToMessageService({
    messageId,
    userId: req.user._id,
    emoji,
    chatId,
  });
  return sendResponse(res, 200, "Reaction updated", message);
});

// ---------------------------------------------------------------------------
// 2.4 — Edit message
// ---------------------------------------------------------------------------

export const editMessage = asyncHandler(async (req, res) => {
  const message = await editMessageService({
    messageId: req.params.messageId,
    userId: req.user._id,
    newContent: req.body.content,
  });
  return sendResponse(res, 200, "Message edited", message);
});

// ---------------------------------------------------------------------------
// 2.5 — Delete message
// ---------------------------------------------------------------------------

export const deleteMessage = asyncHandler(async (req, res) => {
  const scope = req.query.scope === "everyone" ? "everyone" : "me";
  const result = await deleteMessageService({
    messageId: req.params.messageId,
    userId: req.user._id,
    scope,
  });
  return sendResponse(res, 200, `Message deleted (${result.scope})`, result.message);
});

// ---------------------------------------------------------------------------
// 2.6 — Starring
// ---------------------------------------------------------------------------

export const starMessage = asyncHandler(async (req, res) => {
  const starred = await starMessageService({
    messageId: req.params.messageId,
    userId: req.user._id,
  });
  return sendResponse(res, 201, "Message starred", starred);
});

export const unstarMessage = asyncHandler(async (req, res) => {
  await unstarMessageService({
    messageId: req.params.messageId,
    userId: req.user._id,
  });
  return sendResponse(res, 200, "Message unstarred");
});

export const getStarredMessages = asyncHandler(async (req, res) => {
  const data = await getStarredMessagesService({
    userId: req.user._id,
    page:  req.query.page,
    limit: req.query.limit,
  });
  return sendResponse(res, 200, "Starred messages fetched", data);
});

// ---------------------------------------------------------------------------
// 2.7 — Disappearing messages
// ---------------------------------------------------------------------------

export const setDisappearTimer = asyncHandler(async (req, res) => {
  const message = await setDisappearTimerService({
    messageId: req.params.messageId,
    userId: req.user._id,
    seconds: req.body.seconds,
  });
  return sendResponse(res, 200, "Disappear timer set", message);
});
