// local utilities
import { ApiError } from "../utils/ApiError.js";

// node built-ins
import crypto from "node:crypto";

// real-time events
import { emitToRoom } from "../utils/socketEmitter.js";

// local repository
import {
  findOneOnOneChat,
  createOneOnOneChat,
  findUserChats,
  createGroupChat,
  addMemberToGroup,
  removeMemberFromGroup,
  renameGroupChat,
  findConversationById,
  updateGroupInfo,
  promoteToAdmin,
  demoteFromAdmin,
  leaveGroupConversation,
  setInviteToken,
  findByInviteToken,
  updateGroupSettings,
  promoteOldestParticipant,
} from "../repository/conversation.repository.js";
import {
  findUserParticipantRecords,
  updateParticipantSettings,
  findParticipantsByConversation,
} from "../repository/participant.repository.js";
import { isBlockedByUser } from "../repository/user.repository.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if userId is the original groupAdmin OR is in the admins array.
 * Always use this instead of a raw groupAdmin string comparison.
 */
const isGroupAdmin = (conversation, userId) => {
  const uid = userId.toString();
  return (
    conversation.groupAdmin?.toString() === uid ||
    conversation.admins?.some((a) => a.toString() === uid)
  );
};

export const accessChatService = async ({ userId, currentUserId }) => {
  if (!userId) {
    throw new ApiError(400, "UserId param not sent with request");
  }

  if (userId.toString() === currentUserId.toString()) {
    throw new ApiError(400, "Cannot create a chat with yourself");
  }

  // Phase 4 — block check: prevent chat access if either party has blocked the other
  const [blockedByMe, blockedByThem] = await Promise.all([
    isBlockedByUser(currentUserId, userId),
    isBlockedByUser(userId, currentUserId),
  ]);

  if (blockedByMe) throw new ApiError(403, "You have blocked this user");
  if (blockedByThem) throw new ApiError(403, "You cannot message this user");

  const existingChat = await findOneOnOneChat(currentUserId, userId);

  if (existingChat.length > 0) {
    return existingChat[0];
  }

  return createOneOnOneChat(currentUserId, userId);
};

export const fetchChatsService = async (currentUserId) => {
  const [chats, participantRecords] = await Promise.all([
    findUserChats(currentUserId),
    findUserParticipantRecords(currentUserId),
  ]);

  const metadataMap = new Map();
  for (const record of participantRecords) {
    metadataMap.set(record.conversation.toString(), record);
  }

  return chats.map((chat) => {
    const meta = metadataMap.get(chat._id.toString());

    chat.unreadCount = meta?.unreadCount || 0;
    chat.isPinned = meta?.isPinned || false;
    chat.isArchived = meta?.isArchived || false;
    chat.isMuted = meta?.isMuted || false;

    return chat;
  });
};

// --------------------------------------------------
// Group Chat Management
// --------------------------------------------------

export const createGroupChatService = async ({ chatName, participants, adminId }) => {
  if (!chatName || !chatName.trim()) {
    throw new ApiError(400, "Group name is required");
  }

  if (!participants || participants.length < 2) {
    throw new ApiError(400, "At least 2 other participants are required for a group");
  }

  // Ensure admin is included in participants
  const allParticipants = [...new Set([adminId.toString(), ...participants])];

  return createGroupChat({
    chatName: chatName.trim(),
    participants: allParticipants,
    adminId,
  });
};

export const addMemberService = async ({ chatId, userId, currentUserId }) => {
  const conversation = await findConversationById(chatId);

  if (!conversation) {
    throw new ApiError(404, "Chat not found");
  }

  if (!conversation.isGroupChat) {
    throw new ApiError(400, "Cannot add members to a one-on-one chat");
  }

  if (!isGroupAdmin(conversation, currentUserId)) {
    throw new ApiError(403, "Only a group admin can add members");
  }

  if (conversation.participants.some((p) => p.toString() === userId.toString())) {
    throw new ApiError(400, "User is already a member of this group");
  }

  return addMemberToGroup(chatId, userId);
};

export const removeMemberService = async ({ chatId, userId, currentUserId }) => {
  const conversation = await findConversationById(chatId);

  if (!conversation) {
    throw new ApiError(404, "Chat not found");
  }

  if (!conversation.isGroupChat) {
    throw new ApiError(400, "Cannot remove members from a one-on-one chat");
  }

  if (!isGroupAdmin(conversation, currentUserId)) {
    throw new ApiError(403, "Only a group admin can remove members");
  }

  if (userId.toString() === currentUserId.toString()) {
    throw new ApiError(400, "Admin cannot remove themselves");
  }

  return removeMemberFromGroup(chatId, userId);
};

export const renameGroupService = async ({ chatId, chatName, currentUserId }) => {
  if (!chatName || !chatName.trim()) {
    throw new ApiError(400, "Group name is required");
  }

  const conversation = await findConversationById(chatId);

  if (!conversation) {
    throw new ApiError(404, "Chat not found");
  }

  if (!conversation.isGroupChat) {
    throw new ApiError(400, "Cannot rename a one-on-one chat");
  }

  if (!isGroupAdmin(conversation, currentUserId)) {
    throw new ApiError(403, "Only a group admin can rename the group");
  }

  return renameGroupChat(chatId, chatName.trim());
};

// ---------------------------------------------------------------------------
// Phase 4 — Advanced group management
// ---------------------------------------------------------------------------

/**
 * Leave a group voluntarily. If the leaving user is the last admin, the
 * oldest remaining participant is auto-promoted before they leave.
 * If no participants remain after leaving, the conversation is deleted.
 */
export const leaveGroupService = async ({ chatId, userId }) => {
  const conversation = await findConversationById(chatId);
  if (!conversation) throw new ApiError(404, "Chat not found");
  if (!conversation.isGroupChat) throw new ApiError(400, "Cannot leave a one-on-one chat");

  const isMember = conversation.participants.some(
    (p) => p.toString() === userId.toString(),
  );
  if (!isMember) throw new ApiError(400, "You are not a member of this group");

  const remainingParticipants = conversation.participants.filter(
    (p) => p.toString() !== userId.toString(),
  );

  // Auto-promote oldest remaining member if the leaving user is the last admin
  const isLastAdmin =
    isGroupAdmin(conversation, userId) &&
    conversation.admins.filter((a) => a.toString() !== userId.toString()).length === 0;

  if (isLastAdmin && remainingParticipants.length > 0) {
    await promoteOldestParticipant(chatId, userId);
  }

  const updated = await leaveGroupConversation(chatId, userId);
  emitToRoom(chatId, "group_member_left", { chatId, userId });
  return updated;
};

/** Update group name, description, or avatar key (admins only). */
export const updateGroupInfoService = async ({
  chatId,
  currentUserId,
  chatName,
  description,
  groupAvatar,
}) => {
  const conversation = await findConversationById(chatId);
  if (!conversation) throw new ApiError(404, "Chat not found");
  if (!conversation.isGroupChat) throw new ApiError(400, "Not a group chat");
  if (!isGroupAdmin(conversation, currentUserId))
    throw new ApiError(403, "Only admins can update group info");

  const updates = {};
  if (chatName !== undefined) updates.chatName = chatName.trim();
  if (description !== undefined) updates.description = description;
  if (groupAvatar !== undefined) updates.groupAvatar = groupAvatar;

  if (Object.keys(updates).length === 0)
    throw new ApiError(400, "No fields to update");

  const updated = await updateGroupInfo(chatId, updates);
  emitToRoom(chatId, "group_updated", { chatId, updates });
  return updated;
};

/** Promote a participant to admin (only the original creator can do this). */
export const promoteAdminService = async ({ chatId, userId, currentUserId }) => {
  const conversation = await findConversationById(chatId);
  if (!conversation) throw new ApiError(404, "Chat not found");
  if (conversation.groupAdmin.toString() !== currentUserId.toString())
    throw new ApiError(403, "Only the group creator can promote admins");

  if (!conversation.participants.some((p) => p.toString() === userId.toString()))
    throw new ApiError(400, "User is not a member of this group");

  if (conversation.admins.some((a) => a.toString() === userId.toString()))
    throw new ApiError(400, "User is already an admin");

  const updated = await promoteToAdmin(chatId, userId);
  emitToRoom(chatId, "group_admin_promoted", { chatId, userId });
  return updated;
};

/** Demote an admin (only the original creator can do this, cannot demote self). */
export const demoteAdminService = async ({ chatId, userId, currentUserId }) => {
  const conversation = await findConversationById(chatId);
  if (!conversation) throw new ApiError(404, "Chat not found");
  if (conversation.groupAdmin.toString() !== currentUserId.toString())
    throw new ApiError(403, "Only the group creator can demote admins");

  if (userId.toString() === currentUserId.toString())
    throw new ApiError(400, "Group creator cannot demote themselves");

  const updated = await demoteFromAdmin(chatId, userId);
  emitToRoom(chatId, "group_admin_demoted", { chatId, userId });
  return updated;
};

/** Toggle group-level settings such as onlyAdminsCanMessage (admins only). */
export const updateGroupSettingsService = async ({
  chatId,
  currentUserId,
  onlyAdminsCanMessage,
}) => {
  const conversation = await findConversationById(chatId);
  if (!conversation) throw new ApiError(404, "Chat not found");
  if (!isGroupAdmin(conversation, currentUserId))
    throw new ApiError(403, "Only admins can change group settings");

  const settings = {};
  if (onlyAdminsCanMessage !== undefined)
    settings.onlyAdminsCanMessage = onlyAdminsCanMessage;

  const updated = await updateGroupSettings(chatId, settings);
  emitToRoom(chatId, "group_settings_changed", { chatId, settings });
  return updated;
};

/** Generate a new invite link token (admins only). */
export const generateInviteLinkService = async ({ chatId, currentUserId }) => {
  const conversation = await findConversationById(chatId);
  if (!conversation) throw new ApiError(404, "Chat not found");
  if (!conversation.isGroupChat) throw new ApiError(400, "Not a group chat");
  if (!isGroupAdmin(conversation, currentUserId))
    throw new ApiError(403, "Only admins can manage invite links");

  const token = crypto.randomBytes(16).toString("hex");
  await setInviteToken(chatId, token);
  return { inviteToken: token, inviteLink: `${process.env.CLIENT_URL}/join/${token}` };
};

/** Revoke the invite link (admins only). */
export const revokeInviteLinkService = async ({ chatId, currentUserId }) => {
  const conversation = await findConversationById(chatId);
  if (!conversation) throw new ApiError(404, "Chat not found");
  if (!isGroupAdmin(conversation, currentUserId))
    throw new ApiError(403, "Only admins can revoke invite links");

  await setInviteToken(chatId, null);
  return { message: "Invite link revoked" };
};

/** Join a group by invite token. */
export const joinByInviteLinkService = async ({ token, userId }) => {
  const conversation = await findByInviteToken(token);
  if (!conversation) throw new ApiError(404, "Invalid or expired invite link");

  if (conversation.participants.some((p) => p.toString() === userId.toString()))
    throw new ApiError(400, "You are already a member of this group");

  const updated = await addMemberToGroup(conversation._id, userId);
  emitToRoom(conversation._id.toString(), "group_member_added", {
    chatId: conversation._id,
    userId,
  });
  return updated;
};

// ---------------------------------------------------------------------------
// Phase 4 — Conversation settings (pin / archive / mute)
// ---------------------------------------------------------------------------

export const updateConversationSettingsService = async ({
  chatId,
  userId,
  isPinned,
  isArchived,
  isMuted,
}) => {
  const settings = {};
  if (isPinned !== undefined) settings.isPinned = isPinned;
  if (isArchived !== undefined) settings.isArchived = isArchived;
  if (isMuted !== undefined) settings.isMuted = isMuted;

  if (Object.keys(settings).length === 0)
    throw new ApiError(400, "No settings to update");

  return updateParticipantSettings(chatId, userId, settings);
};
