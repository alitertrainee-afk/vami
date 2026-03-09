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
  leaveGroupService,
  updateGroupInfoService,
  promoteAdminService,
  demoteAdminService,
  updateGroupSettingsService,
  generateInviteLinkService,
  revokeInviteLinkService,
  joinByInviteLinkService,
  updateConversationSettingsService,
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

// ---------------------------------------------------------------------------
// Phase 4 — Advanced group management
// ---------------------------------------------------------------------------

export const leaveGroup = asyncHandler(async (req, res) => {
  const result = await leaveGroupService({
    chatId: req.params.chatId,
    userId: req.user._id,
  });
  return sendResponse(res, 200, "Left group successfully", result);
});

export const updateGroupInfo = asyncHandler(async (req, res) => {
  const result = await updateGroupInfoService({
    chatId: req.params.chatId,
    currentUserId: req.user._id,
    chatName: req.body.chatName,
    description: req.body.description,
    groupAvatar: req.body.groupAvatar,
  });
  return sendResponse(res, 200, "Group info updated", result);
});

export const promoteAdmin = asyncHandler(async (req, res) => {
  const result = await promoteAdminService({
    chatId: req.params.chatId,
    userId: req.body.userId,
    currentUserId: req.user._id,
  });
  return sendResponse(res, 200, "User promoted to admin", result);
});

export const demoteAdmin = asyncHandler(async (req, res) => {
  const result = await demoteAdminService({
    chatId: req.params.chatId,
    userId: req.body.userId,
    currentUserId: req.user._id,
  });
  return sendResponse(res, 200, "Admin demoted", result);
});

export const updateGroupSettings = asyncHandler(async (req, res) => {
  const result = await updateGroupSettingsService({
    chatId: req.params.chatId,
    currentUserId: req.user._id,
    onlyAdminsCanMessage: req.body.onlyAdminsCanMessage,
  });
  return sendResponse(res, 200, "Group settings updated", result);
});

export const generateInviteLink = asyncHandler(async (req, res) => {
  const result = await generateInviteLinkService({
    chatId: req.params.chatId,
    currentUserId: req.user._id,
  });
  return sendResponse(res, 200, "Invite link generated", result);
});

export const revokeInviteLink = asyncHandler(async (req, res) => {
  const result = await revokeInviteLinkService({
    chatId: req.params.chatId,
    currentUserId: req.user._id,
  });
  return sendResponse(res, 200, result.message);
});

export const joinByInviteLink = asyncHandler(async (req, res) => {
  const result = await joinByInviteLinkService({
    token: req.params.token,
    userId: req.user._id,
  });
  return sendResponse(res, 200, "Joined group successfully", result);
});

// ---------------------------------------------------------------------------
// Phase 4 — Conversation settings (pin / archive / mute)
// ---------------------------------------------------------------------------

export const updateConversationSettings = asyncHandler(async (req, res) => {
  const result = await updateConversationSettingsService({
    chatId: req.params.chatId,
    userId: req.user._id,
    isPinned: req.body.isPinned,
    isArchived: req.body.isArchived,
    isMuted: req.body.isMuted,
  });
  return sendResponse(res, 200, "Conversation settings updated", result);
});
