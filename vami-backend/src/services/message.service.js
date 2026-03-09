// local utilities
import { ApiError } from "../utils/ApiError.js";

// local repository
import {
  findMessages,
  countMessages,
  findMessageById,
  insertMessage,
  updateConversationLatestMessage,
  upsertReaction,
  editMessageContent,
  deleteMessageForEveryone,
  deleteMessageForUser,
  starMessage,
  unstarMessage,
  findStarredMessages,
  upsertReceipt,
  bulkMarkDelivered,
  aggregateMessageStatus,
  setDisappearTimer,
} from "../repository/message.repository.js";
import {
  findParticipant,
  incrementUnreadForOthers,
  markConversationAsRead,
} from "../repository/participant.repository.js";

// push notifications helper (dynamic import = no circular dep)
const pushNotify = async (recipientIds, payload) => {
  try {
    const { sendPushToUsers } = await import("./push.service.js");
    await sendPushToUsers(recipientIds, payload);
  } catch (err) {
    console.error("[push] notification dispatch failed:", err.message);
  }
};

/** Maximum age of a message that can still be edited or deleted-for-everyone (15 min). */
const EDIT_WINDOW_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const assertParticipant = async (chatId, userId) => {
  const p = await findParticipant(chatId, userId);
  if (!p) throw new ApiError(403, "You are not a member of this conversation");
  return p;
};

const assertMessageOwner = (message, userId) => {
  if (message.sender._id.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only modify your own messages");
  }
};

const assertNotDeleted = (message) => {
  if (message.isDeleted) throw new ApiError(400, "This message has been deleted");
};

const assertEditWindow = (message) => {
  if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) {
    throw new ApiError(400, "Edit window has expired (15 minutes)");
  }
};

// ---------------------------------------------------------------------------
// 2.0 — Get messages (with deletedFor filter)
// ---------------------------------------------------------------------------

export const getAllMessagesService = async (chatId, query, currentUserId) => {
  if (!chatId) throw new ApiError(400, "ChatId is required");

  await assertParticipant(chatId, currentUserId);

  const page  = Math.max(Number(query.page)  || 1,  1);
  const limit = Math.min(Number(query.limit) || 20, 100);
  const skip  = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    findMessages({ chatId, skip, limit, sort: { createdAt: -1 }, currentUserId }),
    countMessages(chatId, currentUserId),
  ]);

  const totalPages = Math.ceil(total / limit);
  return {
    messages: messages.reverse(),
    pagination: { total, totalPages, currentPage: page, hasNext: page < totalPages, hasPrev: page > 1 },
  };
};

// ---------------------------------------------------------------------------
// 2.0 — Send message (with optional replyTo)
// ---------------------------------------------------------------------------

export const sendMessageService = async ({
  senderId,
  chatId,
  content,
  type,
  replyToId,
  // 3.1 — Media fields
  mediaKey,
  mediaUrl,
  mediaMimeType,
  mediaSize,
  mediaDuration,
}) => {
  // Either a text body or a media attachment key is required
  if (!chatId) throw new ApiError(400, "Invalid data passed into request");
  if (!content && !mediaKey) throw new ApiError(400, "Message must have content or a media attachment");

  const message = await insertMessage({
    senderId,
    chatId,
    content,
    type,
    replyToId,
    mediaKey,
    mediaUrl,
    mediaMimeType,
    mediaSize,
    mediaDuration,
  });

  // Enqueue thumbnail generation for media messages
  if (mediaKey && type && type !== "text") {
    import("../queues/media.queue.js")
      .then(({ enqueueMediaProcessing }) =>
        enqueueMediaProcessing({
          messageId:  message._id.toString(),
          mediaKey,
          mediaType:  type,
          mimetype:   mediaMimeType,
        }),
      )
      .catch((err) => console.error("[queue] Failed to enqueue media job:", err));
  }

  await Promise.all([
    updateConversationLatestMessage(chatId, message._id),
    incrementUnreadForOthers(chatId, senderId),
  ]);

  // Phase 5 — Push notifications to offline recipients
  // Fire-and-forget: do not await, never block the response.
  import("../models/Conversation.js")
    .then(async ({ default: Conversation }) => {
      const conv = await Conversation.findById(chatId)
        .populate("participants", "isOnline")
        .lean();

      if (!conv) return;

      const offlineIds = conv.participants
        .filter(
          (p) =>
            p._id.toString() !== senderId.toString() && !p.isOnline,
        )
        .map((p) => p._id.toString());

      if (offlineIds.length === 0) return;

      const senderName = message.sender?.username ?? "Someone";
      const preview =
        message.type === "text"
          ? (content ?? "").slice(0, 80)
          : `\uD83D\uDCCE ${message.type}`;

      await pushNotify(offlineIds, {
        title: senderName,
        body:  preview,
        data:  { chatId, messageId: message._id.toString() },
      });
    })
    .catch((err) => console.error("[push] Conversation lookup failed:", err.message));

  return message;
};

export const markAsReadService = async ({ chatId, userId }) => {
  if (!chatId) throw new ApiError(400, "ChatId is required");
  return markConversationAsRead(chatId, userId);
};

// ---------------------------------------------------------------------------
// 2.1 — Delivery / Read receipts
// ---------------------------------------------------------------------------

export const markDeliveredService = async ({ messageId, userId }) => {
  const message = await findMessageById(messageId);
  if (!message) throw new ApiError(404, "Message not found");

  const receipt = await upsertReceipt({
    messageId,
    conversationId: message.conversation,
    userId,
    status: "delivered",
  });

  const newStatus = await aggregateMessageStatus(messageId, message.sender._id, message.conversation);
  if (newStatus !== message.status) {
    await message.updateOne({ status: newStatus });
  }

  return { receipt, aggregateStatus: newStatus };
};

export const markReadService = async ({ messageId, userId }) => {
  const message = await findMessageById(messageId);
  if (!message) throw new ApiError(404, "Message not found");

  const receipt = await upsertReceipt({
    messageId,
    conversationId: message.conversation,
    userId,
    status: "read",
  });

  const newStatus = await aggregateMessageStatus(messageId, message.sender._id, message.conversation);
  if (newStatus !== message.status) {
    await message.updateOne({ status: newStatus });
  }

  return { receipt, aggregateStatus: newStatus, senderId: message.sender._id };
};

export const bulkMarkDeliveredService = async ({ conversationId, userId }) => {
  return bulkMarkDelivered({ conversationId, userId });
};

// ---------------------------------------------------------------------------
// 2.3 — Reactions
// ---------------------------------------------------------------------------

export const reactToMessageService = async ({ messageId, userId, emoji, chatId }) => {
  await assertParticipant(chatId, userId);

  const message = await findMessageById(messageId);
  if (!message) throw new ApiError(404, "Message not found");
  assertNotDeleted(message);

  return upsertReaction(messageId, userId, emoji);
};

// ---------------------------------------------------------------------------
// 2.4 — Edit message
// ---------------------------------------------------------------------------

export const editMessageService = async ({ messageId, userId, newContent }) => {
  if (!newContent?.trim()) throw new ApiError(400, "Content cannot be empty");

  const message = await findMessageById(messageId);
  if (!message) throw new ApiError(404, "Message not found");
  assertNotDeleted(message);
  assertMessageOwner(message, userId);
  assertEditWindow(message);

  return editMessageContent(messageId, newContent.trim());
};

// ---------------------------------------------------------------------------
// 2.5 — Delete message
// ---------------------------------------------------------------------------

export const deleteMessageService = async ({ messageId, userId, scope }) => {
  const message = await findMessageById(messageId);
  if (!message) throw new ApiError(404, "Message not found");

  if (scope === "everyone") {
    assertMessageOwner(message, userId);
    assertEditWindow(message); // same 15-min window
    return { message: await deleteMessageForEveryone(messageId), scope: "everyone" };
  }

  // Default: delete for me only
  return { message: await deleteMessageForUser(messageId, userId), scope: "me" };
};

// ---------------------------------------------------------------------------
// 2.6 — Starring
// ---------------------------------------------------------------------------

export const starMessageService = async ({ messageId, userId }) => {
  const message = await findMessageById(messageId);
  if (!message) throw new ApiError(404, "Message not found");
  if (message.isDeleted) throw new ApiError(400, "Cannot star a deleted message");

  await assertParticipant(message.conversation.toString(), userId);

  try {
    return await starMessage({ userId, messageId, conversationId: message.conversation });
  } catch (err) {
    if (err.code === 11000) throw new ApiError(400, "Message is already starred");
    throw err;
  }
};

export const unstarMessageService = async ({ messageId, userId }) => {
  const result = await unstarMessage({ userId, messageId });
  if (!result) throw new ApiError(404, "Starred message not found");
  return result;
};

export const getStarredMessagesService = async ({ userId, page, limit }) => {
  const p = Math.max(Number(page)  || 1,  1);
  const l = Math.min(Number(limit) || 20, 100);
  const { items, total } = await findStarredMessages({ userId, page: p, limit: l });
  return {
    items,
    pagination: {
      total,
      totalPages: Math.ceil(total / l),
      currentPage: p,
    },
  };
};

// ---------------------------------------------------------------------------
// 2.7 — Disappearing messages
// ---------------------------------------------------------------------------

export const setDisappearTimerService = async ({ messageId, userId, seconds }) => {
  const message = await findMessageById(messageId);
  if (!message) throw new ApiError(404, "Message not found");
  assertMessageOwner(message, userId);

  const disappearsAt = seconds ? new Date(Date.now() + seconds * 1000) : null;
  return setDisappearTimer(messageId, disappearsAt);
};
