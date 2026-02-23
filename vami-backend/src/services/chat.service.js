// local utilities
import { ApiError } from "../utils/ApiError.js";

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
} from "../repository/conversation.repository.js";
import { findUserParticipantRecords } from "../repository/participant.repository.js";

export const accessChatService = async ({ userId, currentUserId }) => {
  if (!userId) {
    throw new ApiError(400, "UserId param not sent with request");
  }

  if (userId.toString() === currentUserId.toString()) {
    throw new ApiError(400, "Cannot create a chat with yourself");
  }

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

  if (conversation.groupAdmin.toString() !== currentUserId.toString()) {
    throw new ApiError(403, "Only the group admin can add members");
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

  if (conversation.groupAdmin.toString() !== currentUserId.toString()) {
    throw new ApiError(403, "Only the group admin can remove members");
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

  if (conversation.groupAdmin.toString() !== currentUserId.toString()) {
    throw new ApiError(403, "Only the group admin can rename the group");
  }

  return renameGroupChat(chatId, chatName.trim());
};
