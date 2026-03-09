// local models
import Message from "../models/Message.js";
import MessageReceipt from "../models/MessageReceipt.js";
import StarredMessage from "../models/StarredMessage.js";
import Conversation from "../models/Conversation.js";

// -----------------------------------------------------------------------
// Message CRUD
// -----------------------------------------------------------------------

export const findMessages = async ({ chatId, skip, limit, sort, currentUserId }) => {
  return Message.find({
    conversation: chatId,
    isDeleted: false,                    // hide "deleted for everyone"
    deletedFor: { $ne: currentUserId },  // hide "deleted for me"
  })
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate("sender", "username profile.avatar email")
    .populate("replyTo", "content sender type isDeleted")
    .populate("conversation");
};

export const countMessages = async (chatId, currentUserId) => {
  return Message.countDocuments({
    conversation: chatId,
    isDeleted: false,
    deletedFor: { $ne: currentUserId },
  });
};

export const findMessageById = async (messageId) => {
  return Message.findById(messageId).populate("sender", "username profile.avatar email");
};

export const insertMessage = async ({
  senderId,
  chatId,
  content,
  type = "text",
  replyToId,
  // 3.1 — Media fields
  mediaKey,
  mediaUrl,
  mediaMimeType,
  mediaSize,
  mediaDuration,
}) => {
  const doc = {
    sender: senderId,
    content,
    conversation: chatId,
    type,
  };
  if (replyToId)    doc.replyTo       = replyToId;
  if (mediaKey)     doc.mediaKey      = mediaKey;
  if (mediaUrl)     doc.mediaUrl      = mediaUrl;
  if (mediaMimeType) doc.mediaMimeType = mediaMimeType;
  if (mediaSize != null) doc.mediaSize = mediaSize;
  if (mediaDuration != null) doc.mediaDuration = mediaDuration;

  const message = await Message.create(doc);
  return message.populate([
    { path: "sender", select: "username profile.avatar email" },
    { path: "replyTo", select: "content sender type isDeleted" },
  ]);
};

export const updateConversationLatestMessage = async (chatId, messageId) => {
  return Conversation.findByIdAndUpdate(chatId, {
    latestMessage: messageId,
    lastMessageAt: new Date(),
  });
};

// -----------------------------------------------------------------------
// 2.3 — Reactions
// -----------------------------------------------------------------------

/**
 * Upsert a user's reaction on a message.
 * Pass emoji="" to remove the reaction.
 */
export const upsertReaction = async (messageId, userId, emoji) => {
  if (!emoji) {
    // Remove this user's reaction
    return Message.findByIdAndUpdate(
      messageId,
      { $pull: { reactions: { user: userId } } },
      { new: true },
    );
  }

  // Replace any existing reaction from this user, or push a new one
  const updated = await Message.findOneAndUpdate(
    { _id: messageId, "reactions.user": userId },
    { $set: { "reactions.$.emoji": emoji } },
    { new: true },
  );

  if (updated) return updated;

  return Message.findByIdAndUpdate(
    messageId,
    { $push: { reactions: { user: userId, emoji } } },
    { new: true },
  );
};

// -----------------------------------------------------------------------
// 2.4 — Editing
// -----------------------------------------------------------------------

export const editMessageContent = async (messageId, newContent) => {
  return Message.findByIdAndUpdate(
    messageId,
    { content: newContent, isEdited: true, editedAt: new Date() },
    { new: true },
  ).populate("sender", "username profile.avatar email");
};

// -----------------------------------------------------------------------
// 2.5 — Deletion
// -----------------------------------------------------------------------

/** Delete for everyone — replaces content with placeholder, hides message. */
export const deleteMessageForEveryone = async (messageId) => {
  return Message.findByIdAndUpdate(
    messageId,
    { isDeleted: true, content: "This message was deleted", reactions: [] },
    { new: true },
  );
};

/** Delete for me — adds the requesting user to the deletedFor list. */
export const deleteMessageForUser = async (messageId, userId) => {
  return Message.findByIdAndUpdate(
    messageId,
    { $addToSet: { deletedFor: userId } },
    { new: true },
  );
};

// -----------------------------------------------------------------------
// 2.6 — Starring
// -----------------------------------------------------------------------

export const starMessage = async ({ userId, messageId, conversationId }) => {
  return StarredMessage.create({ user: userId, message: messageId, conversation: conversationId });
};

export const unstarMessage = async ({ userId, messageId }) => {
  return StarredMessage.findOneAndDelete({ user: userId, message: messageId });
};

export const findStarredMessages = async ({ userId, page, limit }) => {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    StarredMessage.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: "message",
        populate: { path: "sender", select: "username profile.avatar" },
      })
      .populate("conversation", "chatName isGroupChat"),
    StarredMessage.countDocuments({ user: userId }),
  ]);
  return { items, total };
};

// -----------------------------------------------------------------------
// 2.1 — Delivery / Read receipts
// -----------------------------------------------------------------------

/**
 * Upsert a receipt. Promotes existing "delivered" → "read" automatically.
 */
export const upsertReceipt = async ({ messageId, conversationId, userId, status }) => {
  return MessageReceipt.findOneAndUpdate(
    { message: messageId, user: userId },
    { message: messageId, conversation: conversationId, user: userId, status },
    { upsert: true, new: true },
  );
};

/**
 * Bulk-upsert "delivered" receipts for all messages in a conversation
 * that were sent by someone else and don't yet have a receipt from this user.
 * Called when a user joins a room.
 */
export const bulkMarkDelivered = async ({ conversationId, userId }) => {
  // Find message IDs in this conversation not yet receipted by this user
  const receipted = await MessageReceipt.find(
    { conversation: conversationId, user: userId },
    { message: 1 },
  ).lean();
  const receiptedIds = receipted.map((r) => r.message);

  const undelivered = await Message.find(
    {
      conversation: conversationId,
      sender: { $ne: userId },
      _id: { $nin: receiptedIds },
      isDeleted: false,
    },
    { _id: 1 },
  ).lean();

  if (!undelivered.length) return [];

  const ops = undelivered.map((m) => ({
    updateOne: {
      filter: { message: m._id, user: userId },
      update: { $setOnInsert: { message: m._id, conversation: conversationId, user: userId, status: "delivered" } },
      upsert: true,
    },
  }));
  await MessageReceipt.bulkWrite(ops);
  return undelivered.map((m) => m._id);
};

/**
 * Aggregate the worst-case status across all non-sender receipts for a message.
 * Returns "read" only when every participant has read it; "delivered" if all
 * delivered; otherwise "sent".
 */
export const aggregateMessageStatus = async (messageId, senderId, conversationId) => {
  const { default: Conversation } = await import("../models/Conversation.js");
  const conv = await Conversation.findById(conversationId, { participants: 1 }).lean();
  if (!conv) return "sent";

  const others = conv.participants.filter((p) => p.toString() !== senderId.toString());
  if (!others.length) return "sent";

  const receipts = await MessageReceipt.find(
    { message: messageId, user: { $in: others } },
  ).lean();

  if (receipts.length < others.length) return "sent";
  if (receipts.every((r) => r.status === "read")) return "read";
  return "delivered";
};

// -----------------------------------------------------------------------
// 2.7 — Disappearing messages
// -----------------------------------------------------------------------

/** Set or clear the disappearsAt timestamp on a message. */
export const setDisappearTimer = async (messageId, disappearsAt) => {
  return Message.findByIdAndUpdate(
    messageId,
    { disappearsAt: disappearsAt ?? null },
    { new: true },
  );
};

