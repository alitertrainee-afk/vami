// local utilities
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendResponse } from "../utils/responseHandler.js";

// local services
import {
  accessChatService,
  fetchChatsService,
  createGroupChatService,
  addMemberService,
  removeMemberService,
  renameGroupService,
} from "../services/chat.service.js";

export const accessChat = asyncHandler(async (req, res) => {
  const chat = await accessChatService({
    userId: req.body.userId,
    currentUserId: req.user._id,
  });

  return sendResponse(res, 200, "Chat accessed successfully", chat);
});

export const fetchChats = asyncHandler(async (req, res) => {
  const chats = await fetchChatsService(req.user._id);
  return sendResponse(res, 200, "Chats fetched successfully", chats);
});

export const createGroupChat = asyncHandler(async (req, res) => {
  const chat = await createGroupChatService({
    chatName: req.body.chatName,
    participants: req.body.participants,
    adminId: req.user._id,
  });

  return sendResponse(res, 201, "Group chat created successfully", chat);
});

export const addMember = asyncHandler(async (req, res) => {
  const chat = await addMemberService({
    chatId: req.params.chatId,
    userId: req.body.userId,
    currentUserId: req.user._id,
  });

  return sendResponse(res, 200, "Member added successfully", chat);
});

export const removeMember = asyncHandler(async (req, res) => {
  const chat = await removeMemberService({
    chatId: req.params.chatId,
    userId: req.body.userId,
    currentUserId: req.user._id,
  });

  return sendResponse(res, 200, "Member removed successfully", chat);
});

export const renameGroup = asyncHandler(async (req, res) => {
  const chat = await renameGroupService({
    chatId: req.params.chatId,
    chatName: req.body.chatName,
    currentUserId: req.user._id,
  });

  return sendResponse(res, 200, "Group renamed successfully", chat);
});
