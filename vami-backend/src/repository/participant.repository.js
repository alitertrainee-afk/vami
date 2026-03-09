// local models
import ConversationParticipant from "../models/ConversationParticipant.js";

export const createParticipants = async (conversationId, userIds, session = null) => {
    const docs = userIds.map((userId) => ({
        conversation: conversationId,
        user: userId,
        unreadCount: 0,
    }));

    const options = { ordered: false };
    if (session) options.session = session;

    return ConversationParticipant.insertMany(docs, options);
};

export const findParticipant = async (conversationId, userId) => {
    return ConversationParticipant.findOne({
        conversation: conversationId,
        user: userId,
    });
};

export const incrementUnreadForOthers = async (conversationId, senderUserId) => {
    return ConversationParticipant.updateMany(
        {
            conversation: conversationId,
            user: { $ne: senderUserId },
        },
        { $inc: { unreadCount: 1 } },
    );
};


export const markConversationAsRead = async (conversationId, userId, messageId = null) => {
    const update = {
        unreadCount: 0,
        lastReadAt: new Date(),
    };

    if (messageId) {
        update.lastMessageSeenId = messageId;
    }

    return ConversationParticipant.findOneAndUpdate(
        { conversation: conversationId, user: userId },
        update,
        { new: true },
    );
};

export const findUserParticipantRecords = async (userId) => {
    return ConversationParticipant.find({ user: userId })
        .select("conversation unreadCount isPinned isArchived isMuted lastReadAt")
        .lean();
};


export const deleteParticipants = async (conversationId) => {
    return ConversationParticipant.deleteMany({ conversation: conversationId });
};


export const addParticipant = async (conversationId, userId) => {
    return ConversationParticipant.create({
        conversation: conversationId,
        user: userId,
        unreadCount: 0,
    });
};

export const removeParticipant = async (conversationId, userId) => {
    return ConversationParticipant.findOneAndDelete({
        conversation: conversationId,
        user: userId,
    });
};

// -----------------------------------------------------------------------
// Phase 4 — Conversation settings (pin, archive, mute)
// -----------------------------------------------------------------------

/** Update per-user conversation preferences. */
export const updateParticipantSettings = async (conversationId, userId, settings) => {
  return ConversationParticipant.findOneAndUpdate(
    { conversation: conversationId, user: userId },
    { $set: settings },
    { new: true },
  );
};

/** Return all participant records for a conversation, with user info. */
export const findParticipantsByConversation = async (conversationId) => {
  return ConversationParticipant.find({ conversation: conversationId })
    .populate("user", "username email profile.avatar isOnline lastSeen")
    .lean();
};
